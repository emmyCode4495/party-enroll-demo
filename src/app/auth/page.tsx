"use client";
import { useState, useEffect, Suspense } from "react";
import Logo from "@/components/Logo";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode") || "signin";
  const [mode, setMode] = useState<"signin" | "signup">(modeParam === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setMode(modeParam === "signup" ? "signup" : "signin"); }, [modeParam]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) router.replace("/dashboard"); });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        if (data.user && !data.session) setMessage("Check your email to confirm your account, then sign in.");
        else router.replace("/dashboard");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/dashboard");
      }
    } catch (err: any) { setError(err.message || "Something went wrong"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[var(--paper)]">
      <Link href="/" className="flex items-center gap-2.5 mb-10">
        <Logo className="h-11 w-11" withName nameClassName="text-lg" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="font-display text-2xl font-bold text-[var(--ink)] mb-1">{mode === "signin" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-6">{mode === "signin" ? "Sign in to enrol or manage your membership." : "One account per person. You’ll need it to enrol."}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Full name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="field-input" placeholder="As on your ID" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ink)] mb-1.5">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="field-input" placeholder="Min. 6 characters" />
          </div>
          {error && <div className="p-3 rounded-lg bg-[var(--stamp-tint)] text-[var(--stamp)] text-sm">{error}</div>}
          {message && <div className="p-3 rounded-lg bg-[var(--blue-tint)] text-[var(--blue-deep)] text-sm">{message}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
          {mode === "signin" ? (<>No account? <button onClick={() => setMode("signup")} className="text-[var(--blue)] font-medium hover:underline">Sign up</button></>) : (<>Already have an account? <button onClick={() => setMode("signin")} className="text-[var(--blue)] font-medium hover:underline">Sign in</button></>)}
        </p>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}><AuthForm /></Suspense>;
}
