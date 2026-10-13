"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)] flex items-center justify-center text-white font-bold text-sm shadow-sm">U</div>
            <span className="font-display font-bold text-lg tracking-tight text-[var(--ink)]">Unity Party</span>
          </div>
          <nav className="flex items-center gap-2">
            {loading ? (
              <span className="text-sm text-[var(--ink-soft)]">…</span>
            ) : user ? (
              <>
                <Link href="/dashboard" className="btn btn-primary text-sm px-4 py-2">Dashboard</Link>
                <button onClick={async () => { await supabase.auth.signOut(); router.refresh(); }} className="btn btn-quiet text-sm">Sign out</button>
              </>
            ) : (
              <>
                <Link href="/auth?mode=signin" className="btn btn-quiet text-sm">Sign in</Link>
                <Link href="/auth?mode=signup" className="btn btn-primary text-sm px-4 py-2">Create account</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 md:py-28 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]" style={{ backgroundImage: `radial-gradient(circle at 20% 30%, var(--green) 0, transparent 45%), radial-gradient(circle at 80% 70%, var(--brass) 0, transparent 40%)` }} />
        <p className="text-sm font-medium tracking-wide uppercase text-[var(--green)] mb-4">Official membership portal</p>
        <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight text-[var(--ink)] max-w-3xl leading-[1.1] mb-6">
          Join Unity Party.<br /><span className="text-[var(--green)]">Verified. Secure. Yours.</span>
        </h1>
        <p className="text-lg text-[var(--ink-soft)] max-w-xl mb-10 leading-relaxed">
          Enrol in minutes with biometric face matching against your official ID. Your digital membership card comes with a verifiable QR code.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary text-base px-8 py-3.5 shadow-lg shadow-[var(--green)]/20">Go to Dashboard</Link>
          ) : (
            <>
              <Link href="/auth?mode=signup" className="btn btn-primary text-base px-8 py-3.5 shadow-lg shadow-[var(--green)]/20">Create free account</Link>
              <Link href="/auth?mode=signin" className="btn btn-secondary text-base px-8 py-3.5">Sign in</Link>
            </>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--surface)] py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-12 text-[var(--ink)]">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your account", desc: "Sign up with email. One account per person — every enrolment is tied to you." },
              { step: "02", title: "Verify with your face & ID", desc: "Upload your official ID and match your live face. Processing stays on your device." },
              { step: "03", title: "Get your digital card", desc: "Receive a membership card with a QR code anyone can scan to verify your credentials." },
            ].map((f) => (
              <div key={f.step} className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-6 hover:border-[var(--line-strong)] transition">
                <span className="text-xs font-mono font-semibold text-[var(--brass)] tracking-wider">{f.step}</span>
                <h3 className="font-display font-bold text-lg mt-2 mb-2 text-[var(--ink)]">{f.title}</h3>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 border-t border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
            Each identification document can only be used once. Facial matching runs entirely in your browser — no biometric data is sent to our servers. Your membership is protected by Supabase authentication.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] py-6 text-center text-xs text-[var(--ink-soft)]">
        Unity Party · Official Member Enrolment · Privacy-first biometric verification
      </footer>
    </div>
  );
}
