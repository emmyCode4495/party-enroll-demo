"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Member } from "@/lib/supabase";
import MembershipCard from "@/components/MembershipCard";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/auth?mode=signin"); return; }
      setUser(session.user);
      const { data } = await supabase.from("members").select("*").eq("user_id", session.user.id).maybeSingle();
      setMember(data);
      setLoading(false);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/auth?mode=signin");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--ink-soft)]">Loading…</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)] flex items-center justify-center text-white font-bold text-xs">U</div>
            <span className="font-display font-bold text-[var(--ink)]">Unity Party</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--ink-soft)] hidden sm:inline">{user?.email}</span>
            <button onClick={async () => { await supabase.auth.signOut(); router.replace("/"); }} className="btn btn-quiet text-sm">Sign out</button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--ink)] mb-2">Your membership</h1>
        <p className="text-[var(--ink-soft)] mb-8">
          {member ? "You are a verified member. Scan the QR on your card to show credentials." : "You have not enrolled yet. Complete enrolment to receive your digital card."}
        </p>
        {member ? (
          <div className="max-w-md mx-auto space-y-6">
            <MembershipCard name={member.full_name} dob={member.dob} state={member.state || ""} idNumber={member.id_number} photo={member.photo_url || null} membershipId={member.membership_id} issued={true} />
            <div className="text-center space-y-2">
              <p className="text-sm text-[var(--ink-soft)]">Membership ID: <span className="font-mono text-[var(--ink)]">{member.membership_id}</span></p>
              <Link href={`/verify/${member.membership_id}`} className="text-sm text-[var(--green)] font-medium hover:underline" target="_blank">Open public verification page →</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--green-tint)] flex items-center justify-center">
              <svg className="w-7 h-7 text-[var(--green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h2 className="font-display font-bold text-xl text-[var(--ink)] mb-2">Start enrolment</h2>
            <p className="text-sm text-[var(--ink-soft)] mb-6">You’ll upload your official ID and match your face. Each ID document can only be used once.</p>
            <Link href="/enrol" className="btn btn-primary px-8 py-3">Begin enrolment</Link>
          </div>
        )}
      </main>
    </div>
  );
}
