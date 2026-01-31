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
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3 position-relative overflow-hidden scanline-container">
      <div className="signal-card w-100 max-w-lg p-4 p-md-5 shadow-lg text-center animate-in fade-in duration-500">
        <header className="mb-5">
          <h1 className="display-6 font-serif text-white text-gradient">
            Tami&apos;s Signal
          </h1>
          <p className="text-slate-500 small font-mono mt-2" style={{ fontSize: '10px' }}>
            NEW_NODE_DETECTION • INITIALIZE_SEQUENCE
          </p>
        </header>

        {error && (
          <div className="alert alert-danger mb-4 p-2 rounded small border-opacity-20 bg-danger bg-opacity-10 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="d-grid gap-3">
          <input
            required
            type="text"
            placeholder="FULL_NAME"
            className="form-control font-mono small"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            required
            type="email"
            placeholder="EMAIL_RELAY"
            className="form-control font-mono small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            required
            type="password"
            placeholder="SECURITY_KEY"
            className="form-control font-mono small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            disabled={loading}
            type="submit"
            className="btn btn-primary bg-theme-accent border-0 py-3 rounded-pill font-mono small text-white mt-3"
          >
            {loading ? "PROCESSING..." : "INITIALIZE_SEQUENCE"}
          </button>
        </form>

        <p className="mt-5 text-center small text-slate-500 font-mono" style={{ fontSize: '10px' }}>
          ALREADY_IDENTIFIED?{" "}
          <Link to="/login" className="text-accent text-decoration-none border-bottom border-accent border-opacity-30">
            ACCESS_AUTHORIZED
          </Link>
        </p>
      </div>
    </div>
  );
}
