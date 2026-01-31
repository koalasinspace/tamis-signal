import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmailPage() {
  const { currentUser, resendVerification, logOut } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setMessage("");
    setLoading(true);
    try {
      await resendVerification();
      setMessage("Verification signal dispatched. Check primary and secondary nodes.");
    } catch {
      setMessage("Relay failure. Retry sequence in 60s.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden scanline-container">
      <div className="signal-card w-100 max-w-lg p-4 p-md-5 shadow-lg text-center animate-in fade-in duration-500">
        <header className="mb-5">
          <h1 className="fs-4 font-serif text-white text-gradient">
            Email_Verification
          </h1>
          <p className="text-slate-500 small font-mono mt-2" style={{ fontSize: '10px' }}>
            AWAITING_CONFIRMATION • TARGET: {currentUser?.email}
          </p>
        </header>

        <p className="text-slate-400 small mb-4 lh-lg">
          A verification link has been transmitted to your node. Activate it to finalize the synchronization.
        </p>

        {message && (
          <div className={`alert p-2 small mb-4 font-mono ${message.includes('failure') ? 'alert-danger border-opacity-20 bg-danger bg-opacity-10 text-red-200' : 'alert-info border-opacity-20 bg-theme-opacity-10 text-accent'}`}>
            &gt; {message}
          </div>
        )}

        <div className="d-grid gap-3">
          <button
            onClick={handleResend}
            disabled={loading}
            className="btn btn-primary bg-theme-accent border-0 py-3 rounded-pill font-mono small text-white"
          >
            {loading ? "TRANSMITTING..." : "RESEND_SIGNAL"}
          </button>
          <button
            onClick={() => logOut()}
            className="btn btn-link text-slate-600 hover-text-white text-decoration-none font-mono small"
            style={{ fontSize: '10px' }}
          >
            TERMINATE_SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
