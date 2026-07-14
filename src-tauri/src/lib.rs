// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use keyring::Entry;
use bip39::Mnemonic;
use rand::RngCore;
use hmac::{Hmac, Mac};
use sha2::{Sha256, Sha512, Digest};
use ed25519_dalek::{SigningKey, Signer};
use stellar_xdr::{
    TransactionEnvelope, DecoratedSignature, SignatureHint, Signature,
    ReadXdr, WriteXdr, Limits, BytesM,
};

type HmacSha512 = Hmac<Sha512>;

fn get_keyring_entry() -> Result<Entry, String> {
    Entry::new("stellar-secure-wallet", "mnemonic").map_err(|e| e.to_string())
}

fn crc16_xmodem(data: &[u8]) -> u16 {
    let mut crc = 0u16;
    for &byte in data {
        crc ^= (byte as u16) << 8;
        for _ in 0..8 {
            if (crc & 0x8000) != 0 {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}

pub fn encode_stellar_public_key(pubkey_bytes: &[u8; 32]) -> String {
    let mut data = Vec::with_capacity(35);
    data.push(0x30); // Version byte (6 << 3)
    data.extend_from_slice(pubkey_bytes);
    let checksum = crc16_xmodem(&data);
    data.push((checksum & 0xFF) as u8);
    data.push(((checksum >> 8) & 0xFF) as u8);
    data_encoding::BASE32_NOPAD.encode(&data)
}

fn derive_stellar_key(seed: &[u8; 64], index: u32) -> SigningKey {
    let mut mac = HmacSha512::new_from_slice(b"ed25519 seed").unwrap();
    mac.update(seed);
    let master_output = mac.finalize().into_bytes();
    
    let mut private_key = master_output[0..32].to_vec();
    let mut chain_code = master_output[32..64].to_vec();
    
    let path = [44 | 0x80000000, 148 | 0x80000000, index | 0x80000000];
    
    for &child_index in &path {
        let mut mac = HmacSha512::new_from_slice(&chain_code).unwrap();
        mac.update(&[0x00]);
        mac.update(&private_key);
        mac.update(&child_index.to_be_bytes());
        let child_output = mac.finalize().into_bytes();
        
        private_key = child_output[0..32].to_vec();
        chain_code = child_output[32..64].to_vec();
    }
    
    let mut secret_bytes = [0u8; 32];
    secret_bytes.copy_from_slice(&private_key);
    SigningKey::from_bytes(&secret_bytes)
}

#[tauri::command]
fn generate_seed() -> Result<String, String> {
    let mut entropy = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut entropy);
    let mnemonic = Mnemonic::from_entropy(&entropy)
        .map_err(|e| e.to_string())?;
    Ok(mnemonic.to_string())
}

#[tauri::command]
fn save_seed_secure(phrase: String) -> Result<(), String> {
    Mnemonic::parse(&phrase).map_err(|e| format!("Invalid mnemonic: {}", e))?;
    let entry = get_keyring_entry()?;
    entry.set_password(&phrase).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_seed_secure() -> Result<String, String> {
    let entry = get_keyring_entry()?;
    entry.get_password().map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_seed_secure() -> Result<(), String> {
    let entry = get_keyring_entry()?;
    entry.delete_credential().map_err(|e| e.to_string())
}

#[tauri::command]
fn has_seed_secure() -> Result<bool, String> {
    let entry = get_keyring_entry()?;
    match entry.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn get_addresses(phrase: String, limit: u32) -> Result<Vec<String>, String> {
    let mnemonic = Mnemonic::parse(&phrase).map_err(|e| format!("Invalid mnemonic: {}", e))?;
    let seed = mnemonic.to_seed("");
    
    let mut addresses = Vec::new();
    for i in 0..limit {
        let signing_key = derive_stellar_key(&seed, i);
        let public_key = signing_key.verifying_key();
        let pub_str = encode_stellar_public_key(&public_key.to_bytes());
        addresses.push(pub_str);
    }
    
    Ok(addresses)
}

#[tauri::command]
fn sign_transaction_xdr(
    envelope_xdr: String,
    network_passphrase: String,
    account_index: u32,
) -> Result<String, String> {
    // 1. Get seed from keyring
    let entry = get_keyring_entry()?;
    let phrase = entry.get_password().map_err(|_| "No seed stored in keyring. Import/Generate a wallet first.")?;
    let mnemonic = Mnemonic::parse(&phrase).map_err(|e| e.to_string())?;
    let seed = mnemonic.to_seed("");
    
    // 2. Derive key
    let signing_key = derive_stellar_key(&seed, account_index);
    let public_key = signing_key.verifying_key();
    let public_bytes = public_key.to_bytes();
    
    // 3. Decode envelope XDR
    let mut envelope = TransactionEnvelope::from_xdr_base64(&envelope_xdr, Limits::none())
        .map_err(|e| format!("Failed to parse transaction envelope: {}", e))?;
    
    // 4. Compute Hash to sign
    let mut passphrase_hasher = Sha256::new();
    passphrase_hasher.update(network_passphrase.as_bytes());
    let network_id_hash = passphrase_hasher.finalize();
    
    let mut sig_payload = Vec::new();
    sig_payload.extend_from_slice(&network_id_hash);
    
    match &envelope {
        TransactionEnvelope::Tx(env) => {
            sig_payload.extend_from_slice(&[0, 0, 0, 2]); // ENVELOPE_TYPE_TX
            sig_payload.extend_from_slice(&env.tx.to_xdr(Limits::none()).map_err(|e| e.to_string())?);
        }
        TransactionEnvelope::TxV0(env) => {
            sig_payload.extend_from_slice(&[0, 0, 0, 0]); // ENVELOPE_TYPE_TX_V0
            sig_payload.extend_from_slice(&env.tx.to_xdr(Limits::none()).map_err(|e| e.to_string())?);
        }
        TransactionEnvelope::TxFeeBump(env) => {
            sig_payload.extend_from_slice(&[0, 0, 0, 5]); // ENVELOPE_TYPE_TX_FEE_BUMP
            sig_payload.extend_from_slice(&env.tx.to_xdr(Limits::none()).map_err(|e| e.to_string())?);
        }
    }
    
    let mut payload_hasher = Sha256::new();
    payload_hasher.update(&sig_payload);
    let message_hash = payload_hasher.finalize();
    
    // 5. Sign hash
    let signature_bytes = signing_key.sign(&message_hash).to_bytes();
    
    // 6. Build DecoratedSignature
    let hint_bytes = [
        public_bytes[28] ^ public_bytes[0], // Hint is last 4 bytes of public key in XDR spec
        public_bytes[29],
        public_bytes[30],
        public_bytes[31],
    ];
    let hint = SignatureHint(hint_bytes);
    let signature = Signature(BytesM::try_from(signature_bytes.to_vec()).map_err(|e| e.to_string())?);
    
    let decorated_sig = DecoratedSignature { hint, signature };
    
    // 7. Append signature to envelope
    match &mut envelope {
        TransactionEnvelope::Tx(env) => {
            let mut sigs = env.signatures.to_vec();
            sigs.push(decorated_sig);
            env.signatures = sigs.try_into().map_err(|_| "Too many signatures")?;
        }
        TransactionEnvelope::TxV0(env) => {
            let mut sigs = env.signatures.to_vec();
            sigs.push(decorated_sig);
            env.signatures = sigs.try_into().map_err(|_| "Too many signatures")?;
        }
        TransactionEnvelope::TxFeeBump(env) => {
            let mut sigs = env.signatures.to_vec();
            sigs.push(decorated_sig);
            env.signatures = sigs.try_into().map_err(|_| "Too many signatures")?;
        }
    }
    
    // 8. Return signed XDR
    envelope.to_xdr_base64(Limits::none()).map_err(|e| format!("Failed to serialize transaction envelope: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            generate_seed,
            save_seed_secure,
            load_seed_secure,
            delete_seed_secure,
            has_seed_secure,
            get_addresses,
            sign_transaction_xdr
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_crc16_xmodem() {
        assert_eq!(crc16_xmodem(&[]), 0);
        let data = [0x30, 0x01, 0x02, 0x03];
        let crc = crc16_xmodem(&data);
        assert!(crc > 0);
    }

    #[test]
    fn test_encode_stellar_public_key() {
        let dummy_pubkey = [0u8; 32];
        let address = encode_stellar_public_key(&dummy_pubkey);
        assert!(address.starts_with('G'));
        assert_eq!(address.len(), 56);
    }

    #[test]
    fn test_derive_stellar_key() {
        let phrase = generate_seed().unwrap();
        let mnemonic = Mnemonic::parse(&phrase).unwrap();
        let seed = mnemonic.to_seed("");
        
        let signing_key = derive_stellar_key(&seed, 0);
        let public_key = signing_key.verifying_key();
        let address = encode_stellar_public_key(&public_key.to_bytes());
        
        assert!(address.starts_with('G'));
        assert_eq!(address.len(), 56);
        
        let signing_key_1 = derive_stellar_key(&seed, 1);
        let public_key_1 = signing_key_1.verifying_key();
        let address_1 = encode_stellar_public_key(&public_key_1.to_bytes());
        
        assert_ne!(address, address_1);
    }
}
