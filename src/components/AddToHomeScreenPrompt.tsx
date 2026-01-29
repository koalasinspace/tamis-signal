import React, { useEffect, useMemo, useState } from "react";
import { Home, PlusSquare, Share } from "lucide-react";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function isSafariOnIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  // Exclude common iOS in-app browsers / wrappers.
  const isChrome = /CriOS/.test(ua);
  const isFirefox = /FxiOS/.test(ua);
  const isEdge = /EdgiOS/.test(ua);
  const isSafari = /Safari/.test(ua) && !isChrome && !isFirefox && !isEdge;
  return isIOS && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;
  // iOS Safari exposes navigator.standalone when launched from home screen.
  const iosStandalone = typeof w.navigator?.standalone === "boolean" ? w.navigator.standalone : false;
  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(iosStandalone || displayModeStandalone);
}

export default function AddToHomeScreenPrompt({
  storageKey = "tamis-signal:a2hs-dismissed",
  title = "Add to Home Screen",
}: {
  storageKey?: string;
  title?: string;
}) {
  const eligible = useMemo(() => isIos() && !isStandalone(), []);
  const safariEligible = useMemo(() => isSafariOnIos() && !isStandalone(), []);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "true");
    } catch {
      // ignore
    }
  }, [storageKey]);

  if (!eligible || dismissed) return null;

  return (
    <div className="mt-4 p-4 rounded-2xl border border-[#533483]/40 bg-[#0f0f1a]/70 backdrop-blur shadow-lg shadow-purple-900/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Home size={16} className="text-[#a855f7]" />
            <h3 className="font-serif text-base text-[#e2e8f0]">{title}</h3>
          </div>
          <p className="text-sm text-[#e2e8f0]/70 mt-1">
            Install <span className="text-[#d946ef] font-medium">Tami&apos;s Signal</span> on your iPhone for a fast, app-like experience.
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-mono text-[#e2e8f0]/60 hover:text-[#e2e8f0]"
          onClick={() => {
            try {
              window.localStorage.setItem(storageKey, "true");
            } catch {
              // ignore
            }
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>

      {safariEligible ? (
        <ol className="mt-3 space-y-2 text-sm text-[#e2e8f0]/80">
          <li className="flex gap-2">
            <span className="font-mono text-[#a855f7]">1</span>
            <span className="flex items-center gap-2">
              Tap <Share size={14} className="text-[#d946ef]" /> <span className="font-medium">Share</span>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#a855f7]">2</span>
            <span className="flex items-center gap-2">
              Scroll and choose <PlusSquare size={14} className="text-[#d946ef]" />{" "}
              <span className="font-medium">Add to Home Screen</span>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-mono text-[#a855f7]">3</span>
            <span>Tap <span className="font-medium">Add</span>.</span>
          </li>
        </ol>
      ) : (
        <div className="mt-3 p-3 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40 text-sm text-[#e2e8f0]/80">
          You&apos;re likely in an in-app browser (Gmail/Instagram/etc). Open this page in{" "}
          <span className="font-medium">Safari</span>, then use <span className="font-medium">Share → Add to Home Screen</span>.
        </div>
      )}
    </div>
  );
}

