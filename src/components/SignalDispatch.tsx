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
        // Sort in-memory by createdAt (requirement); then keep last 5.
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

  // After a dispatch, watch the created doc for extension-updated delivery fields.
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
      () => {
        // ignore
      }
    );
    return () => unsub();
  }, [lastDocId, mailCollectionRef]);

  const invitedBy = auth.currentUser?.uid;
  const subject = "You have been summoned to Tami's Signal";
  const baseText = "The Grimoire awaits. Enter the void at tamissignal.tycorp2.com";
  const extra = customMessage.trim();
  const text = extra ? `${baseText}\n\n${extra}` : baseText;
  
  // Escape HTML for text replacement
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

  <p style="font-size: 16px; line-height: 1.8; color: #a5b4fc;">
    The shadows have shifted, and the void has recognized your resonance.
  </p>

  <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; border-left: 3px solid #d946ef; padding-left: 15px; font-style: italic;">
    "By blood, by star, and by sequence—the Grimoire is ready to be written."
  </p>

  <p style="font-size: 16px; line-height: 1.8; margin-top: 20px;">
    You have been granted ${escapeHtml(titleValue)} status. It is time to imbue your Soulprint and claim your ${escapeHtml(claimValue)}.
  </p>

  <div style="text-align: center; margin: 40px 0;">
    <a href="https://tamissignal.tycorp2.com" style="background: linear-gradient(to right, #9d4edd, #d946ef); color: #ffffff; padding: 15px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; border-bottom: 4px solid #5a189a; display: inline-block; text-transform: uppercase; letter-spacing: 1px;">
      ENTER THE VOID
    </a>
  </div>

  <div style="border-top: 1px solid #1e1e30; padding-top: 20px; margin-top: 40px; font-size: 10px; color: #4e4e6a; text-align: center;">
    <p>AUTHORIZED DISPATCH FOR: ${escapeHtml(emailValue)}</p>
    <p>ORIGIN: oracle@tamissignal.tycorp2.com | RELAY: Resend</p>
  </div>
</div>
  `.trim();

  const previewPayload = {
    to: email.trim(),
    message: { subject, text, html },
    metadata: {
      type: "invitation" as const,
      invitedBy: invitedBy ?? "(not logged in)",
      appVersion: "2.5",
    },
    createdAt: "(serverTimestamp())",
  };

  const handleCopyPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(previewPayload, null, 2));
      setStatus({ type: "success", message: "Payload JSON Copied" });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: `Void Rejection: could not copy (${err instanceof Error ? err.message : String(err)})`,
      });
    }
  };

  const handleDispatch = async () => {
    const to = email.trim();
    if (!isValidEmail(to)) {
      setStatus({ type: "error", message: "Void Rejection: enter a valid email address." });
      return;
    }
    if (!invitedBy) {
      setStatus({ type: "error", message: "Void Rejection: you must be logged in to dispatch a signal." });
      return;
    }

    setLoading(true);
    setStatus(null);
    setLastDocId(null);
    setLastDocStatus(null);

    try {
      const created = await addDoc(mailCollectionRef, {
        to,
        message: { subject, text, html },
        metadata: {
          type: "invitation",
          invitedBy,
          appVersion: "2.5",
        },
        createdAt: serverTimestamp(),
      });
      setLastDocId(created.id);
      setEmail("");
      setTitle("");
      setClaim("");
      setCustomMessage("");
      setStatus({ type: "success", message: "Signal Dispatched" });
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: `Void Rejection: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {status && (
        <div
          className={`p-3 rounded-xl border backdrop-blur ${
            status.type === "success"
              ? "bg-[#0f0f1a]/70 border-[#a855f7]/40 text-[#e2e8f0]"
              : "bg-[#1a1a2e]/70 border-[#e94560]/50 text-[#e2e8f0]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">{status.message}</div>
            <button
              type="button"
              onClick={() => setStatus(null)}
              className="text-xs text-[#e2e8f0]/70 hover:text-[#e2e8f0]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl border border-[#533483]/40 bg-[#1a1a2e]/60 backdrop-blur shadow-lg shadow-purple-900/20">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-serif text-lg text-[#e2e8f0]">SignalDispatch</h3>
            <p className="text-xs text-[#e2e8f0]/60 font-mono">
              artifacts/tamis-signal-v2/public/data/mail
            </p>
          </div>
          <div className="text-xs font-mono text-[#d946ef]">Oracle v2.5</div>
        </div>

        <div className="mb-4 p-3 rounded-xl border border-[#533483]/25 bg-[#0f0f1a]/50">
          <div className="text-xs font-mono text-[#e2e8f0]/70">
            projectId: <span className="text-[#e2e8f0]">{app?.options?.projectId ?? "unknown"}</span>
          </div>
          <div className="text-xs font-mono text-[#e2e8f0]/70 mt-1">
            lastDocId: <span className="text-[#e2e8f0]">{lastDocId ?? "—"}</span>
            {lastDocStatus ? <span className="text-[#d946ef]"> • {lastDocStatus}</span> : null}
          </div>
          <div className="text-[11px] text-[#e2e8f0]/60 mt-1">
            If emails aren’t sending, check whether your docs get a <span className="font-mono">delivery</span> field (or an <span className="font-mono">error</span> field) after creation.
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0f0f1a]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono hover:border-[#d946ef]/60 hover:bg-[#0f0f1a]/80 transition-colors"
            title="Copy the exact Firestore payload (preview)"
          >
            <Copy size={14} />
            Copy Payload JSON
          </button>
          <div className="text-[11px] font-mono text-[#e2e8f0]/50">
            invitedBy: {invitedBy ? `${invitedBy.slice(0, 6)}…` : "not logged in"}
          </div>
        </div>

        <label className="block text-xs font-mono text-[#e2e8f0]/70 mb-2">Target Email</label>
        <input
          type="email"
          placeholder="you@domain.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-[#0f0f1a] border border-[#533483]/50 rounded-xl p-3 text-sm text-[#e2e8f0] placeholder:text-[#e2e8f0]/30 focus:outline-none focus:ring-2 focus:ring-[#d946ef] focus:border-[#d946ef]"
        />

        <label className="block text-xs font-mono text-[#e2e8f0]/70 mt-4 mb-2">Title</label>
        <input
          type="text"
          placeholder="e.g., Administrator, Seeker, Initiate"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#0f0f1a] border border-[#533483]/50 rounded-xl p-3 text-sm text-[#e2e8f0] placeholder:text-[#e2e8f0]/30 focus:outline-none focus:ring-2 focus:ring-[#d946ef] focus:border-[#d946ef]"
        />

        <label className="block text-xs font-mono text-[#e2e8f0]/70 mt-4 mb-2">Claim</label>
        <input
          type="text"
          placeholder="e.g., your place in the Digital Grimoire, your destiny"
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          className="w-full bg-[#0f0f1a] border border-[#533483]/50 rounded-xl p-3 text-sm text-[#e2e8f0] placeholder:text-[#e2e8f0]/30 focus:outline-none focus:ring-2 focus:ring-[#d946ef] focus:border-[#d946ef]"
        />

        <label className="block text-xs font-mono text-[#e2e8f0]/70 mt-4 mb-2">Custom Invite Message (optional)</label>
        <textarea
          placeholder="Whisper your custom summoning..."
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          className="w-full bg-[#0f0f1a] border border-[#533483]/50 rounded-xl p-3 text-sm text-[#e2e8f0] placeholder:text-[#e2e8f0]/30 focus:outline-none focus:ring-2 focus:ring-[#d946ef] focus:border-[#d946ef] min-h-[110px] resize-y"
        />

        <button
          type="button"
          onClick={handleDispatch}
          disabled={loading}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#9d4edd] hover:bg-[#a855f7] text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Zap className="animate-pulse" size={18} />
              Dispatching…
            </>
          ) : (
            <>
              <Send size={18} />
              Send Signal
            </>
          )}
        </button>
      </div>

      <div className="p-6 rounded-2xl border border-[#533483]/30 bg-[#0f0f1a]/70 backdrop-blur shadow-lg shadow-purple-900/20">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-serif text-base text-[#e2e8f0]">Recent Echoes</h4>
          <span className="text-xs font-mono text-[#e2e8f0]/50">last 5</span>
        </div>

        {recent.length === 0 ? (
          <div className="text-sm text-[#e2e8f0]/50">No invitations yet.</div>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div
                key={r.id}
                className="p-3 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-[#e2e8f0] truncate">{r.to ?? "—"}</div>
                    <div className="text-[11px] font-mono text-[#e2e8f0]/60 mt-1">
                      {formatWhen(r.createdAt)}
                      {r.metadata?.invitedBy ? ` • by ${r.metadata.invitedBy.slice(0, 6)}…` : ""}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-[#d946ef]">
                    {r.delivery?.state ?? r.metadata?.type ?? "invitation"}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="px-2 py-1 rounded-lg bg-[#0f0f1a]/60 border border-[#533483]/35 text-[#e2e8f0]/80 text-[11px] font-mono hover:border-[#d946ef]/60 transition-colors"
                  >
                    {expandedId === r.id ? "Hide Debug" : "Show Debug"}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(r.id)}
                    className="px-2 py-1 rounded-lg bg-[#0f0f1a]/60 border border-[#533483]/35 text-[#e2e8f0]/80 text-[11px] font-mono hover:border-[#d946ef]/60 transition-colors inline-flex items-center gap-1"
                    title="Copy document ID"
                  >
                    <Copy size={12} />
                    Copy Doc ID
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(JSON.stringify(r, null, 2))}
                    className="px-2 py-1 rounded-lg bg-[#0f0f1a]/60 border border-[#533483]/35 text-[#e2e8f0]/80 text-[11px] font-mono hover:border-[#d946ef]/60 transition-colors inline-flex items-center gap-1"
                    title="Copy full doc (debug)"
                  >
                    <Copy size={12} />
                    Copy Doc JSON
                  </button>
                </div>

                {expandedId === r.id && (
                  <pre className="mt-2 p-3 rounded-xl bg-[#0f0f1a]/70 border border-[#533483]/25 text-[11px] text-[#e2e8f0]/80 overflow-x-auto">
{JSON.stringify(
  {
    id: r.id,
    to: r.to,
    createdAt: r.createdAt ? formatWhen(r.createdAt) : null,
    metadata: r.metadata,
    message: { subject: r.message?.subject },
    delivery: r.delivery,
    error: r.error,
  },
  null,
  2
)}
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

