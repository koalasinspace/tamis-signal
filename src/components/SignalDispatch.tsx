import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { Copy, Send, Zap } from "lucide-react";
import { app, auth, db } from "../lib/firebase";

type InviteDoc = {
  id: string;
  to?: string;
  createdAt?: Timestamp | null;
  metadata?: { type?: string; invitedBy?: string; appVersion?: string };
  message?: { subject?: string };
  delivery?: { state?: string; error?: unknown; attempts?: number; info?: unknown };
  error?: unknown;
};

function isValidEmail(email: string): boolean {
  const e = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function formatWhen(ts?: Timestamp | null): string {
  if (!ts) return "…pending";
  try {
    return ts.toDate().toLocaleString();
  } catch {
    return "…pending";
  }
}

export default function SignalDispatch() {
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [claim, setClaim] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recent, setRecent] = useState<InviteDoc[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  const [lastDocStatus, setLastDocStatus] = useState<string | null>(null);

  const mailCollectionRef = useMemo(
    () => collection(db, "artifacts", "tamis-signal-v2", "public", "data", "mail"),
    []
  );

  useEffect(() => {
    const q = query(mailCollectionRef, orderBy("createdAt", "desc"), limit(10));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: InviteDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        docs.sort((a, b) => {
          const am = a.createdAt?.toMillis?.() ?? 0;
          const bm = b.createdAt?.toMillis?.() ?? 0;
          return bm - am;
        });
        setRecent(docs.slice(0, 5));
      },
      (err) => {
        setStatus({ type: "error", message: `Void Rejection: ${err.message}` });
      }
    );
    return () => unsub();
  }, [mailCollectionRef]);

  useEffect(() => {
    if (!lastDocId) return;
    const ref = doc(mailCollectionRef, lastDocId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = (snap.data() as any) ?? {};
        const state = data?.delivery?.state ?? (data?.delivery ? "delivery updated" : "queued");
        setLastDocStatus(state);
      },
      () => {}
    );
    return () => unsub();
  }, [lastDocId, mailCollectionRef]);

  const invitedBy = auth.currentUser?.uid;
  const subject = "You have been summoned to Tami's Signal";
  const baseText = "The Grimoire awaits. Enter the void at tamissignal.tycorp2.com";
  const extra = customMessage.trim();
  const text = extra ? `${baseText}\n\n${extra}` : baseText;
  
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
  
  const emailValue = email.trim() || "$email";
  const titleValue = title.trim() || "$title";
  const claimValue = claim.trim() || "$claim";
  
  const html = `
<div style="background: #0f0f1a; color: #e2e8f0; padding: 40px; font-family: 'Courier New', Courier, monospace; border: 2px solid #9d4edd; border-radius: 12px; max-width: 600px; margin: 20px auto; box-shadow: 0 10px 30px rgba(157, 78, 221, 0.2);">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #d946ef; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; font-size: 24px; border-bottom: 1px solid #533483; padding-bottom: 10px;">
      Tami's Signal
    </h1>
    <p style="color: #9d4edd; font-size: 10px; margin-top: 5px; letter-spacing: 0.5em;">ORACLE INITIALIZATION v2.5</p>
  </div>
  <p style="font-size: 16px; line-height: 1.8; color: #a5b4fc;">The shadows have shifted, and the void has recognized your resonance.</p>
  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; border-left: 3px solid #d946ef; padding-left: 15px; font-style: italic;">"By blood, by star, and by sequence—the Grimoire is ready to be written."</p>
  <p style="font-size: 16px; line-height: 1.8; margin-top: 20px;">You have been granted ${escapeHtml(titleValue)} status. It is time to imbue your Soulprint and claim your ${escapeHtml(claimValue)}.</p>
  <div style="text-align: center; margin: 40px 0;">
    <a href="https://tamissignal.tycorp2.com" style="background: linear-gradient(to right, #9d4edd, #d946ef); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; border-bottom: 4px solid #5a189a; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">ENTER THE VOID</a>
  </div>
  <div style="border-top: 1px solid #1e1e30; padding-top: 20px; margin-top: 40px; font-size: 10px; color: #4e4e6a; text-align: center;">
    <p>AUTHORIZED DISPATCH FOR: ${escapeHtml(emailValue)}</p>
    <p>ORIGIN: oracle@tamissignal.tycorp2.com | RELAY: Resend</p>
  </div>
</div>
  `.trim();

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ to: email.trim(), message: { subject, text, html }, metadata: { type: "invitation", invitedBy: invitedBy ?? "(not logged in)", appVersion: "2.5" }, createdAt: "(serverTimestamp())" }, null, 2));
      setStatus({ type: "success", message: "Payload JSON Copied" });
    } catch (err: unknown) {
      setStatus({ type: "error", message: `Void Rejection: could not copy` });
    }
  };

  const handleDispatch = async () => {
    const to = email.trim();
    if (!isValidEmail(to)) {
      setStatus({ type: "error", message: "Void Rejection: enter a valid email address." });
      return;
    }
    if (!invitedBy) {
      setStatus({ type: "error", message: "Void Rejection: you must be logged in." });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const created = await addDoc(mailCollectionRef, { to, message: { subject, text, html }, metadata: { type: "invitation", invitedBy, appVersion: "2.5" }, createdAt: serverTimestamp() });
      setLastDocId(created.id);
      setEmail(""); setTitle(""); setClaim(""); setCustomMessage("");
      setStatus({ type: "success", message: "Signal Dispatched" });
    } catch (err: unknown) {
      setStatus({ type: "error", message: `Void Rejection: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-grid gap-3">
      {status && (
        <div className={`p-3 rounded border backdrop-blur ${status.type === "success" ? "bg-slate-900 bg-opacity-70 border-purple-500 border-opacity-40 text-slate-200" : "bg-danger bg-opacity-20 border-danger border-opacity-50 text-slate-200"}`}>
          <div className="d-flex align-items-center justify-content-between gap-3">
            <div className="small font-medium">{status.message}</div>
            <button type="button" onClick={() => setStatus(null)} className="btn btn-link btn-sm text-slate-200 opacity-70 p-0 text-decoration-none">Dismiss</button>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl border border-purple-500 border-opacity-40 bg-slate-900 bg-opacity-60 backdrop-blur shadow-sm">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
          <div>
            <h3 className="font-serif fs-5 text-slate-200">SignalDispatch</h3>
            <p className="small text-slate-400 font-mono" style={{ fontSize: '10px' }}>artifacts/tamis-signal-v2/public/data/mail</p>
          </div>
          <div className="small font-mono text-purple-400" style={{ fontSize: '10px' }}>Oracle v2.5</div>
        </div>

        <div className="mb-4 p-3 rounded border border-purple-500 border-opacity-25 bg-slate-950 bg-opacity-50">
          <div className="small font-mono text-slate-400" style={{ fontSize: '10px' }}>projectId: <span className="text-slate-200">{app?.options?.projectId ?? "unknown"}</span></div>
          <div className="small font-mono text-slate-400 mt-1" style={{ fontSize: '10px' }}>lastDocId: <span className="text-slate-200">{lastDocId ?? "—"}</span>{lastDocStatus ? <span className="text-purple-400"> • {lastDocStatus}</span> : null}</div>
        </div>

        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
          <button type="button" onClick={handleCopyPayload} className="btn btn-sm bg-slate-950 border border-purple-500 border-opacity-40 text-slate-200 small font-mono d-flex align-items-center gap-2">
            <Copy size={14} /> Copy Payload JSON
          </button>
        </div>

        <div className="mb-3">
          <label className="d-block small font-mono text-slate-400 mb-1" style={{ fontSize: '10px' }}>Target Email</label>
          <input type="email" placeholder="you@domain.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-100 bg-slate-950 border border-purple-500 border-opacity-50 rounded p-3 small text-slate-200 focus-outline-none focus-border-purple-500" />
        </div>

        <div className="mb-3">
          <label className="d-block small font-mono text-slate-400 mb-1" style={{ fontSize: '10px' }}>Title</label>
          <input type="text" placeholder="e.g., Administrator, Seeker" value={title} onChange={(e) => setTitle(e.target.value)} className="w-100 bg-slate-950 border border-purple-500 border-opacity-50 rounded p-3 small text-slate-200 focus-outline-none focus-border-purple-500" />
        </div>

        <div className="mb-3">
          <label className="d-block small font-mono text-slate-400 mb-1" style={{ fontSize: '10px' }}>Claim</label>
          <input type="text" placeholder="e.g., your place in the Grimoire" value={claim} onChange={(e) => setClaim(e.target.value)} className="w-100 bg-slate-950 border border-purple-500 border-opacity-50 rounded p-3 small text-slate-200 focus-outline-none focus-border-purple-500" />
        </div>

        <div className="mb-3">
          <label className="d-block small font-mono text-slate-400 mb-1" style={{ fontSize: '10px' }}>Custom Message</label>
          <textarea placeholder="Whisper your custom summoning..." value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="w-100 bg-slate-950 border border-purple-500 border-opacity-50 rounded p-3 small text-slate-200 focus-outline-none focus-border-purple-500 min-h-100" />
        </div>

        <button type="button" onClick={handleDispatch} disabled={loading} className="btn btn-primary w-100 py-3 rounded bg-purple-600 border-0 d-flex align-items-center justify-content-center gap-2">
          {loading ? <><Zap className="animate-pulse" size={18} /> Dispatching…</> : <><Send size={18} /> Send Signal</>}
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-purple-500 border-opacity-30 bg-slate-950 bg-opacity-70 backdrop-blur shadow-sm">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="font-serif fs-6 text-slate-200 mb-0">Recent Echoes</h4>
          <span className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>last 5</span>
        </div>

        {recent.length === 0 ? <div className="small text-slate-500">No invitations yet.</div> : (
          <div className="d-grid gap-2">
            {recent.map((r) => (
              <div key={r.id} className="p-3 rounded border border-purple-500 border-opacity-25 bg-slate-900 bg-opacity-40">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="min-w-0">
                    <div className="small text-slate-200 truncate">{r.to ?? "—"}</div>
                    <div className="small font-mono text-slate-500 mt-1" style={{ fontSize: '9px' }}>{formatWhen(r.createdAt)}{r.metadata?.invitedBy ? ` • by ${r.metadata.invitedBy.slice(0, 6)}…` : ""}</div>
                  </div>
                  <div className="small font-mono text-purple-400" style={{ fontSize: '9px' }}>{r.delivery?.state ?? r.metadata?.type ?? "invitation"}</div>
                </div>
                <div className="mt-2 d-flex flex-wrap gap-2">
                  <button type="button" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)} className="btn btn-sm btn-link text-slate-400 p-0 text-decoration-none small font-mono" style={{ fontSize: '9px' }}>{expandedId === r.id ? "Hide Debug" : "Show Debug"}</button>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(r.id)} className="btn btn-sm btn-link text-slate-400 p-0 text-decoration-none small font-mono d-flex align-items-center gap-1" style={{ fontSize: '9px' }}><Copy size={10} /> Copy ID</button>
                </div>
                {expandedId === r.id && (
                  <pre className="mt-2 p-2 rounded bg-slate-950 border border-purple-500 border-opacity-25 small text-slate-400 overflow-auto" style={{ fontSize: '9px' }}>
                    {JSON.stringify({ id: r.id, to: r.to, createdAt: r.createdAt ? formatWhen(r.createdAt) : null, metadata: r.metadata, message: { subject: r.message?.subject }, delivery: r.delivery, error: r.error }, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
