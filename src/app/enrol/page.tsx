"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import EnrolmentWizard from "@/components/EnrolmentWizard";

export default function EnrolPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth?mode=signin"); return; }
      const { data } = await supabase.from("members").select("membership_id").eq("user_id", session.user.id).maybeSingle();
      if (data) { router.replace("/dashboard"); return; }
      setUserId(session.user.id);
      setReady(true);
    };
    check();
  }, [router]);

  if (!ready || !userId) return <div className="min-h-screen flex items-center justify-center text-[var(--ink-soft)]">Checking account…</div>;

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">← Dashboard</Link>
          <span className="font-display font-bold text-[var(--ink)]">Enrolment</span>
          <div className="w-20" />
        </div>
      </header>
      <EnrolmentWizard userId={userId} />
    </div>
  );
}
