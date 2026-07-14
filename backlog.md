# Aegis Secure Vault - Project Backlog & Roadmap

The following tasks are scoped issues planned for future **Stellar Drips Wave** development sprints. If you are a contributor looking to claim an issue, please choose one from below, discuss it in the GitHub issues, and get assigned!

---

## 🛠️ Feature Backlog

### 1. 🔍 Transaction XDR Decoder Component
* **Complexity**: Medium
* **Description**: Currently, the Transaction Builder and Multisig Co-Signer take transaction XDRs, but users cannot see what they are signing. Implement a decoding step using `@stellar/stellar-sdk` or a lightweight decoder on the frontend to parse and display the transaction details (Source Account, Sequence Number, Fee, Operations list, and parameters) in a readable UI card before the user clicks "Sign".
* **Key Files**: `src/components/TransactionBuilder.jsx`, `src/components/MultisigSigner.jsx`
* **Skills Needed**: React, Stellar JavaScript SDK

### 2. 🧪 Automated UI Tests
* **Complexity**: Medium
* **Description**: Set up a frontend testing suite using Vitest and React Testing Library. Add unit/integration tests for components such as the tab switcher, address selector in `WalletManager.jsx`, and validation states in `MultisigSigner.jsx`.
* **Key Files**: `src/components/*`
* **Skills Needed**: Vitest, React Testing Library, NPM configuration

### 🌐 3. Multi-Network Selection Support
* **Complexity**: Medium
* **Description**: Add a global network dropdown in the top-bar or sidebar to let the user switch between `Stellar Testnet`, `Stellar Public Network`, and `Soroban Futurenet`. Pass the correct network passphrase to the backend when calling `sign_transaction_xdr`.
* **Key Files**: `src/App.jsx`, `src-tauri/src/lib.rs`
* **Skills Needed**: React, Rust (Tauri commands)

### 🔒 4. Encrypted Wallet Backup & Restore
* **Complexity**: High
* **Description**: Provide a way for users to export their wallet configuration. Add a "Backup Vault" button that takes the mnemonic from the OS keychain, encrypts it in Rust using a user-specified password (using AES-GCM, which is already in `Cargo.toml`), and exports it as a `.vault` JSON file. Add a corresponding "Restore from Backup" flow.
* **Key Files**: `src-tauri/src/lib.rs`, `src/components/WalletManager.jsx`
* **Skills Needed**: Rust, React, AES-GCM cryptography

### 📜 5. Soroban Smart Contract Invocation Support
* **Complexity**: High
* **Description**: Expand the Transaction Builder to support building transactions that invoke Soroban smart contracts. Add inputs for:
  * Contract ID
  * Function Name
  * Arguments (with basic type selection: Symbol, U32, String, Address, etc.)
  * Build the corresponding Soroban invocation transaction.
* **Key Files**: `src/components/TransactionBuilder.jsx`
* **Skills Needed**: React, Stellar SDK (Soroban transaction building)
