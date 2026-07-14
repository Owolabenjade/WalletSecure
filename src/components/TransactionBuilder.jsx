import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { TransactionBuilder, Account, Asset, Operation, Memo } from "@stellar/stellar-sdk";

export default function TransactionBuilderComponent({ activeAddress, accountIndex }) {
  const [network, setNetwork] = useState("TESTNET");
  const [seqNumber, setSeqNumber] = useState("");
  const [baseFee, setBaseFee] = useState("100");
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memoText, setMemoText] = useState("");
  
  const [unsignedXdr, setUnsignedXdr] = useState("");
  const [signedXdr, setSignedXdr] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passphraseMap = {
    TESTNET: "Test SDF Network ; September 2015",
    PUBLIC: "Public Global Stellar Network ; October 2015",
  };

  async function handleBuildAndSign() {
    setError("");
    setSuccess("");
    setUnsignedXdr("");
    setSignedXdr("");

    if (!activeAddress) {
      setError("Please load a wallet first to get a source account.");
      return;
    }
    if (!seqNumber) {
      setError("Please enter a valid sequence number.");
      return;
    }
    if (!destination) {
      setError("Please enter a destination address.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      // 1. Setup Source Account
      const sourceAccount = new Account(activeAddress, seqNumber);

      // 2. Build Transaction
      let txBuilder = new TransactionBuilder(sourceAccount, {
        fee: baseFee,
        networkPassphrase: passphraseMap[network],
      })
      .addOperation(
        Operation.payment({
          destination: destination.trim(),
          asset: Asset.native(),
          amount: amount.trim(),
        })
      )
      .setTimeout(180);

      if (memoText.trim()) {
        txBuilder = txBuilder.addMemo(Memo.text(memoText.trim()));
      }

      const tx = txBuilder.build();
      const unsignedXdrStr = tx.toXDR();
      setUnsignedXdr(unsignedXdrStr);

      // 3. Invoke Rust Sign Command
      const signedXdrStr = await invoke("sign_transaction_xdr", {
        envelopeXdr: unsignedXdrStr,
        networkPassphrase: passphraseMap[network],
        accountIndex: accountIndex,
      });

      setSignedXdr(signedXdrStr);
      setSuccess("Transaction successfully signed offline by secure vault!");
    } catch (err) {
      setError("Failed to build or sign transaction: " + err.message || err);
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  return (
    <div className="glass-panel">
      <h2>Offline Transaction Builder & Signer</h2>
      <p style={{ color: "#94a3b8", marginBottom: "2rem" }}>
        Construct a transaction and sign it locally using your secure hardware-derived key.
      </p>

      {error && <div className="alert-badge alert-warning">⚠ {error}</div>}
      {success && <div className="alert-badge alert-success">✓ {success}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Form Inputs */}
        <div style={{ textAlign: "left" }}>
          <h3>Transaction Details</h3>
          
          <div className="form-group">
            <label>Target Network</label>
            <select className="select-field" value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="TESTNET">Stellar Testnet</option>
              <option value="PUBLIC">Stellar Public Network</option>
            </select>
          </div>

          <div className="form-group">
            <label>Source Address (derived index {accountIndex})</label>
            <input className="input-field" type="text" value={activeAddress || "No wallet loaded"} disabled />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Sequence Number</label>
              <input 
                className="input-field" 
                type="number" 
                placeholder="e.g. 129038" 
                value={seqNumber} 
                onChange={(e) => setSeqNumber(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Base Fee (Stroops)</label>
              <input 
                className="input-field" 
                type="number" 
                value={baseFee} 
                onChange={(e) => setBaseFee(e.target.value)} 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Destination Address (G...)</label>
            <input 
              className="input-field" 
              type="text" 
              placeholder="e.g. GAAA..." 
              value={destination} 
              onChange={(e) => setDestination(e.target.value)} 
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div className="form-group">
              <label>Amount (XLM)</label>
              <input 
                className="input-field" 
                type="number" 
                placeholder="0.0" 
                step="any"
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
              />
            </div>
            <div className="form-group">
              <label>Memo Text (Optional)</label>
              <input 
                className="input-field" 
                type="text" 
                placeholder="e.g. Ref: 1023" 
                value={memoText} 
                onChange={(e) => setMemoText(e.target.value)} 
              />
            </div>
          </div>

          <button className="btn btn-primary" style={{ marginTop: "1rem", width: "100%" }} onClick={handleBuildAndSign}>
            Build & Sign Offline
          </button>
        </div>

        {/* XDR Outputs */}
        <div style={{ textAlign: "left" }}>
          <h3>Transaction Envelope XDR</h3>
          <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
            The base64 encoded XDR payloads.
          </p>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Unsigned XDR</label>
            <textarea 
              className="textarea-field" 
              readOnly 
              placeholder="Unsigned XDR will appear here..."
              value={unsignedXdr} 
            />
            {unsignedXdr && (
              <button 
                className="btn btn-secondary" 
                style={{ alignSelf: "flex-start", marginTop: "0.25rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => copyToClipboard(unsignedXdr)}
              >
                Copy Unsigned
              </button>
            )}
          </div>

          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Signed XDR (Offline Signature Appended)</label>
            <textarea 
              className="textarea-field" 
              readOnly 
              placeholder="Signed XDR will appear here..."
              value={signedXdr} 
              style={{ borderColor: signedXdr ? "#06b6d4" : "rgba(255,255,255,0.08)" }}
            />
            {signedXdr && (
              <button 
                className="btn btn-primary" 
                style={{ alignSelf: "flex-start", marginTop: "0.25rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                onClick={() => copyToClipboard(signedXdr)}
              >
                Copy Signed XDR
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
