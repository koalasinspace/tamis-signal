import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { Copy, Send, Zap } from "lucide-react";
import { auth, db } from "../lib/firebase";

type InviteDoc = {
  id: string;
  to?: string;
  createdAt?: Timestamp | null;
  metadata?: { type?: string; invitedBy?: string; appVersion?: string };
  message?: { subject?: string };
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
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recent, setRecent] = useState<InviteDoc[]>([]);

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

  const invitedBy = auth.currentUser?.uid;
  const subject = "You have been summoned to Tami's Signal";
  const baseText = "The Grimoire awaits. Enter the void at tamissignal.tycorp2.com";
  const extra = customMessage.trim();
  const text = extra ? `${baseText}\n\n${extra}` : baseText;
  const html = `
      <div style="background: #1a1a2e; color: #e94560; padding: 40px; font-family: sans-serif; border: 2px solid #533483; border-radius: 8px;">
        <h1 style="color: #9d4edd; text-align: center;">TAMI'S SIGNAL</h1>
        <p style="font-size: 18px; line-height: 1.6;">The shadows are shifting, and your presence is requested.</p>
        <p>You have been invited by an Administrator to initialize your <strong>Soulprint</strong> and begin your journey through the Digital Grimoire.</p>
        ${extra ? `<p style="font-size: 16px; line-height: 1.6; color: #e2e8f0;">${extra.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>` : ""}
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://tamissignal.tycorp2.com" style="background: #9d4edd; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; border-bottom: 3px solid #5a189a;">ENTER THE VOID</a>
        </div>
        <p style="margin-top: 40px; font-size: 12px; color: #4e4e6a;">Authorized Domain: tamissignal.tycorp2.com | Oracle v2.5</p>
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

    try {
      await addDoc(mailCollectionRef, {
        to,
        message: { subject, text, html },
        metadata: {
          type: "invitation",
          invitedBy,
          appVersion: "2.5",
        },
        createdAt: serverTimestamp(),
      });
      setEmail("");
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
                    {r.metadata?.type ?? "invitation"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

