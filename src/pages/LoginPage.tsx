import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message.replace(/^Firebase:\s*/i, "").trim() : "Login failed");
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
            WELCOME_BACK • ACCESS_AUTHORIZED
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
            type="email"
            placeholder="EMAIL_ADDRESS"
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
            {loading ? "INITIALIZING..." : "ENTER_THE_VOID"}
          </button>
        </form>

        <p className="mt-5 text-center small text-slate-500 font-mono" style={{ fontSize: '10px' }}>
          NO_ACCOUNT?{" "}
          <Link to="/signup" className="text-accent text-decoration-none border-bottom border-accent border-opacity-30">
            REGISTER_NODES
          </Link>
        </p>
      </div>
    </div>
  );
}
