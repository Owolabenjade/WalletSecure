import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function WalletManager({ activeAddress, setActiveAddress, setAccountIndex }) {
  const [hasSecureSeed, setHasSecureSeed] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [importMnemonic, setImportMnemonic] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    checkWalletStatus();
  }, []);

  async function checkWalletStatus() {
    try {
      const hasSeed = await invoke("has_seed_secure");
      setHasSecureSeed(hasSeed);
      if (hasSeed) {
        // Automatically derive first address to show active account
        deriveAddressesFromStored();
      }
    } catch (err) {
      setError("Failed to check secure keyring status: " + err);
    }
  }

  async function generateNewSeed() {
    setError("");
    setSuccess("");
    try {
      const phrase = await invoke("generate_seed");
      setMnemonic(phrase);
    } catch (err) {
      setError("Failed to generate seed: " + err);
    }
  }

  async function saveGeneratedSeed() {
    setError("");
    setSuccess("");
    try {
      await invoke("save_seed_secure", { phrase: mnemonic });
      setHasSecureSeed(true);
      setMnemonic("");
      setSuccess("Wallet seed saved securely in Windows Credential Manager!");
      deriveAddressesFromStored();
    } catch (err) {
      setError("Failed to save seed securely: " + err);
    }
  }

  async function handleImport() {
    setError("");
    setSuccess("");
    if (!importMnemonic.trim()) {
      setError("Please enter a valid mnemonic phrase.");
      return;
    }
    try {
      await invoke("save_seed_secure", { phrase: importMnemonic.trim() });
      setHasSecureSeed(true);
      setImportMnemonic("");
      setSuccess("Mnemonic phrase imported and saved securely!");
      deriveAddressesFromStored();
    } catch (err) {
      setError("Import failed: " + err);
    }
  }

  async function deriveAddressesFromStored() {
    setError("");
    try {
      const phrase = await invoke("load_seed_secure");
      const derived = await invoke("get_addresses", { phrase, limit: 5 });
      setAddresses(derived);
      if (derived.length > 0) {
        setActiveAddress(derived[selectedIdx]);
      }
    } catch (err) {
      setError("Failed to derive addresses: " + err);
    }
  }

  async function deleteWallet() {
    if (!confirm("Are you absolutely sure you want to delete your seed from the secure OS vault? Make sure you have backed it up!")) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await invoke("delete_seed_secure");
      setHasSecureSeed(false);
      setAddresses([]);
      setActiveAddress("");
      setSuccess("Wallet credentials deleted from OS keychain.");
    } catch (err) {
      setError("Failed to delete credentials: " + err);
    }
  }

  function handleSelectAddress(idx) {
    setSelectedIdx(idx);
    setAccountIndex(idx);
    if (addresses[idx]) {
      setActiveAddress(addresses[idx]);
    }
  }

  return (
    <div className="glass-panel">
      <h2>Wallet Security Manager</h2>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
        Manages your Stellar mnemonic phrase using the OS Credential Store. Private keys never touch the frontend.
      </p>

      {error && <div className="alert-badge alert-warning">⚠ {error}</div>}
      {success && <div className="alert-badge alert-success">✓ {success}</div>}

      {hasSecureSeed ? (
        <div>
          <div className="alert-badge alert-success" style={{ justifyContent: "space-between" }}>
            <span>✓ Wallet status: Encrypted and locked in OS Secure Vault.</span>
            <button className="btn btn-danger" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }} onClick={deleteWallet}>
              Delete Wallet
            </button>
          </div>

          <div style={{ marginTop: "2rem", textAlign: "left" }}>
            <h3>Derived Stellar Accounts</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Select which account to derive and build transactions with (Paths follow BIP-44: m/44'/148'/index'):
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              {addresses.map((addr, idx) => (
                <div 
                  key={idx} 
                  className="address-item" 
                  style={{ 
                    border: selectedIdx === idx ? "1px solid #06b6d4" : "1px solid rgba(255, 255, 255, 0.03)",
                    background: selectedIdx === idx ? "rgba(6, 182, 212, 0.05)" : "rgba(3, 7, 18, 0.35)",
                    cursor: "pointer"
                  }}
                  onClick={() => handleSelectAddress(idx)}
                >
                  <div className="address-info">
                    <span className="address-index">index {idx}</span>
                    <span className="address-string">{addr}</span>
                  </div>
                  {selectedIdx === idx && <span style={{ color: "#06b6d4", fontWeight: 600 }}>Active</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "1rem" }}>
          {/* Generate Wallet */}
          <div style={{ borderRight: "1px solid rgba(255, 255, 255, 0.05)", paddingRight: "2rem", textAlign: "left" }}>
            <h3>Create New Wallet</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Generate a cryptographically secure 12-word mnemonic phrase.
            </p>
            {!mnemonic ? (
              <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={generateNewSeed}>
                Generate 12 Words
              </button>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <div className="mnemonic-grid">
                  {mnemonic.split(" ").map((word, idx) => (
                    <div key={idx} className="mnemonic-word">
                      <span className="mnemonic-index">{idx + 1}</span>
                      <span>{word}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="btn btn-primary" onClick={saveGeneratedSeed}>
                    Secure Save in OS Keychain
                  </button>
                  <button className="btn btn-secondary" onClick={() => setMnemonic("")}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Import Wallet */}
          <div style={{ textAlign: "left" }}>
            <h3>Import Existing Wallet</h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Enter your 12 or 24-word seed phrase to write it directly into the secure key manager.
            </p>
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>Mnemonic Phrase</label>
              <textarea 
                className="textarea-field" 
                placeholder="word1 word2 word3..." 
                value={importMnemonic}
                onChange={(e) => setImportMnemonic(e.target.value)}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleImport}>
              Import securely
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
