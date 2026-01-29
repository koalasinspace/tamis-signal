import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signUp(name, email, password);
      navigate("/verify-email", { replace: true });
      return;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/i, "").trim() : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-purple-50 font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />
      <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-300">
            Tami's Signal
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-2">
            Create your account
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="text"
            placeholder="Full Name"
            className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            required
            type="email"
            placeholder="Email Address"
            className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            placeholder="Password"
            className="w-full bg-slate-950 border border-purple-500/30 rounded p-3 text-sm focus:outline-none focus:border-purple-500 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            disabled={loading}
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-3 rounded shadow-lg transition-all mt-4 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-400 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
