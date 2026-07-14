# Contributing to Aegis Secure Vault

Thank you for your interest in contributing to Aegis Secure Vault! This project is participating in the **Stellar Drips Wave** program to reward contributors for their open-source contributions to the Stellar ecosystem.

---

## 🚀 Getting Started

To get started, you need to set up the Tauri + React development environment on your local machine.

### Prerequisites

1. **Node.js**: Version 18 or higher (LTS recommended).
2. **Rust**: Make sure you have `rustup` installed. You can install it from [rustup.rs](https://rustup.rs/).
3. **Tauri System Dependencies**:
   * **Windows**: Visual Studio C++ Build Tools and WebView2.
   * **macOS**: CLToolchain (Xcode Command Line Tools).
   * **Linux**: `webkit2gtk`, `build-essential`, `curl`, and other libraries.
   * Refer to the official [Tauri Setup Guide](https://v2.tauri.app/start/prerequisites/) for detailed OS-specific setup.

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Owolabenjade/WalletSecure.git
   cd WalletSecure
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

---

## 🌊 Stellar Drips Wave Guidelines

If you are contributing as part of the Stellar Drips Wave program, please follow these steps to ensure you receive your USDC rewards:

1. **Register**: Sign up and link your GitHub account on [drips.network/wave/stellar](https://drips.network/wave/stellar).
2. **Find Issues**: Browse the repository issues. Look for open issues labeled with `drips-wave` or `good first issue`.
3. **Apply**: Express your interest in the issue comments on GitHub. The maintainer will assign the issue to you.
4. **Develop**: Create a new branch, implement the feature, and ensure all tests pass (see [Testing](#-testing)).
5. **Submit PR**: Open a Pull Request referencing the issue number (e.g. `Closes #12`).
6. **Reward**: Once the PR is approved and merged by the maintainer, your points will be finalized in the Drips interface and converted to USDC at the end of the wave cycle.

---

## 🛠️ Development & Coding Standards

* **Keep Security First**: Aegis Secure Vault uses the OS Credential Vault (Windows Credential Manager, macOS Keychain, Linux Secret Service) via Rust. **Never** expose mnemonic phrases or private keys to the Javascript frontend. All cryptographic operations (signing, derivation) must happen inside the Rust backend (`src-tauri`).
* **Code Formatting**:
  * Run `npm run lint` or `prettier` on frontend files.
  * Run `cargo fmt` inside the `src-tauri` directory before committing Rust changes.
* **Commit Messages**: Write clear, imperative-style commit messages (e.g., `feat: add transaction history tab` or `fix: resolve overflow in address list`).

---

## 🧪 Testing

We require that any new features or core logic updates are accompanied by relevant tests.

* **Rust Tests**: Run unit tests from the `src-tauri` directory:
  ```bash
  cd src-tauri
  cargo test
  ```

---

## 💬 Communication

If you have questions, feel free to open an issue or reach out to the project maintainers on GitHub!
