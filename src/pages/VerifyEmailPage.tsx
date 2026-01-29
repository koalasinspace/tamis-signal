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
      setMessage("Verification email sent. Check your inbox (and spam).");
    } catch {
      setMessage("Failed to resend. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-purple-50 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />
      <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative z-10 text-center">
        <h1 className="text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-300 mb-2">
          Confirm your email
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          We sent a verification link to <strong className="text-purple-200">{currentUser?.email}</strong>. Click it to activate your account, then log in.
        </p>
        {message && (
          <p className="mb-4 text-sm text-purple-300">{message}</p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium py-3 rounded disabled:opacity-50"
          >
            {loading ? "Sending…" : "Resend verification email"}
          </button>
          <button
            onClick={() => logOut()}
            className="w-full text-slate-400 hover:text-white text-sm"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
