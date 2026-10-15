"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function WalletGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18M16 14.5h2" strokeLinecap="round" />
    </svg>
  );
}

export default function AddToWallet({ className = "" }: { className?: string }) {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [available, setAvailable] = useState<{ apple: boolean; google: boolean } | null>(null);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    fetch("/api/wallet/status")
      .then((r) => r.json())
      .then(setAvailable)
      .catch(() => setAvailable({ apple: false, google: false }));
  }, []);

  if (!platform || !available) return null;

  const showApple = available.apple && platform !== "android";
  const showGoogle = available.google && platform !== "ios";
  if (!showApple && !showGoogle) return null;

  const add = async (kind: "apple" | "google") => {
    setBusy(kind);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch(`/api/wallet/${kind}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || "Could not create your wallet card. Try again.");
      // A plain navigation lets Safari show "Add to Wallet" and opens Google's save page.
      window.location.href = body.url;
    } catch (e: any) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        {showApple && (
          <button
            onClick={() => add("apple")}
            disabled={busy !== null}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-bold text-white transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            <WalletGlyph />
            {busy === "apple" ? "Preparing…" : "Add to Apple Wallet"}
          </button>
        )}
        {showGoogle && (
          <button
            onClick={() => add("google")}
            disabled={busy !== null}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-white px-5 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--paper)] disabled:opacity-60"
          >
            <WalletGlyph />
            {busy === "google" ? "Preparing…" : "Add to Google Wallet"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm font-medium text-[var(--stamp)]">
          {error}
        </p>
      )}
    </div>
  );
}
