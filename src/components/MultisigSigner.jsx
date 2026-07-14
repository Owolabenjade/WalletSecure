import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

export default function MultisigSigner({ activeAddress, accountIndex }) {
  const [network, setNetwork] = useState("TESTNET");
  const [inputXdr, setInputXdr] = useState("");
  const [signedXdr, setSignedXdr] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passphraseMap = {
    TESTNET: "Test SDF Network ; September 2015",
    PUBLIC: "Public Global Stellar Network ; October 2015",
  };

  async function handleSignAndAppend() {
    setError("");
    setSuccess("");
    setSignedXdr("");

    if (!inputXdr.trim()) {
      setError("Please paste a valid transaction envelope XDR.");
      return;
    }

    try {
      // Invoke Rust sign command
      const outputXdr = await invoke("sign_transaction_xdr", {
        envelopeXdr: inputXdr.trim(),
        networkPassphrase: passphraseMap[network],
        accountIndex: accountIndex,
      });

      setSignedXdr(outputXdr);
      setSuccess("Signature successfully appended to the transaction envelope!");
    } catch (err) {
      setError("Failed to sign transaction envelope: " + err);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  return (
    <div className="glass-panel">
      <h2>Offline Multisig Co-Signer</h2>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
        Paste a transaction envelope XDR from a co-signer, inspect it, and append your signature.
      </p>

      {error && <div className="alert-badge alert-warning">⚠ {error}</div>}
      {success && <div className="alert-badge alert-success">✓ {success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Form Inputs */}
        <div style={{ textAlign: "left" }}>
          <h3>Signer Details</h3>

          <div className="form-group">
            <label>Target Network</label>
            <select className="select-field" value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="TESTNET">Stellar Testnet</option>
              <option value="PUBLIC">Stellar Public Network</option>
            </select>
          </div>

          <div className="form-group">
            <label>Signing Key Address (derived index {accountIndex})</label>
            <input className="input-field" type="text" value={activeAddress || "No wallet loaded"} disabled />
          </div>

          <div className="form-group">
            <label>Transaction Envelope XDR (Pasted)</label>
            <textarea 
              className="textarea-field" 
              placeholder="Paste transaction envelope XDR here..." 
              value={inputXdr}
              onChange={(e) => setInputXdr(e.target.value)}
              style={{ minHeight: "150px" }}
            />
          </div>

          <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={handleSignAndAppend}>
            Sign & Append Signature
          </button>
        </div>

        {/* Output */}
        <div style={{ textAlign: "left" }}>
          <h3>Output Transaction Envelope XDR</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            The updated XDR payload including your signature.
          </p>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Co-signed Envelope XDR</label>
            <textarea 
              className="textarea-field" 
              readOnly 
              placeholder="Signed XDR with appended signature will appear here..."
              value={signedXdr} 
              style={{ minHeight: "220px", borderColor: signedXdr ? "#06b6d4" : "rgba(255,255,255,0.08)" }}
            />
            {signedXdr && (
              <button 
                className="btn btn-primary" 
                style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                onClick={() => copyToClipboard(signedXdr)}
              >
                Copy Co-signed XDR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
