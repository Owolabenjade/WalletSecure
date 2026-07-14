import { useState } from "react";
import WalletManager from "./components/WalletManager";
import TransactionBuilder from "./components/TransactionBuilder";
import MultisigSigner from "./components/MultisigSigner";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("wallet");
  const [activeAddress, setActiveAddress] = useState("");
  const [accountIndex, setAccountIndex] = useState(0);

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className="brand">
          <div className="brand-logo">🛡️</div>
          <span className="brand-name">Aegis Secure Vault</span>
        </div>

        <div className="nav-links">
          <button 
            className={`nav-button ${activeTab === "wallet" ? "active" : ""}`}
            onClick={() => setActiveTab("wallet")}
          >
            <span>🔑</span> Wallet Security
          </button>
          <button 
            className={`nav-button ${activeTab === "builder" ? "active" : ""}`}
            onClick={() => setActiveTab("builder")}
          >
            <span>🛠️</span> Transaction Builder
          </button>
          <button 
            className={`nav-button ${activeTab === "multisig" ? "active" : ""}`}
            onClick={() => setActiveTab("multisig")}
          >
            <span>✍️</span> Multisig Co-Signer
          </button>
        </div>

        {/* Footer info in sidebar */}
        <div style={{ marginTop: "auto", textAlign: "left", padding: "1rem 0" }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Active Key Address:</div>
          <div 
            style={{ 
              fontSize: "0.75rem", 
              color: activeAddress ? "#06b6d4" : "#64748b",
              fontFamily: "monospace",
              wordBreak: "break-all",
              marginTop: "0.25rem"
            }}
          >
            {activeAddress || "No key loaded"}
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <main className="main-content">
        {activeTab === "wallet" && (
          <WalletManager 
            activeAddress={activeAddress} 
            setActiveAddress={setActiveAddress}
            setAccountIndex={setAccountIndex}
          />
        )}
        {activeTab === "builder" && (
          <TransactionBuilder 
            activeAddress={activeAddress}
            accountIndex={accountIndex}
          />
        )}
        {activeTab === "multisig" && (
          <MultisigSigner 
            activeAddress={activeAddress}
            accountIndex={accountIndex}
          />
        )}
      </main>
    </div>
  );
}

export default App;
