"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase, type Member } from "@/lib/supabase";
import MembershipCard from "@/components/MembershipCard";

export default function VerifyPage() {
  const params = useParams();
  const id = params.id as string;
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data, error } = await supabase.from("members").select("*").eq("membership_id", id).eq("verified", true).maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("Membership not found or not verified.");
      else setMember(data);
      setLoading(false);
    };
    load();
  }, [id]);

  return (
    <div className="min-h-screen bg-[var(--paper)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)] flex items-center justify-center text-white font-bold text-xs">U</div>
            <span className="font-display font-bold text-[var(--ink)]">Unity Party</span>
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--green)]">Verified credentials</span>
        </div>
      </header>
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        {loading && <p className="text-center text-[var(--ink-soft)]">Looking up membership…</p>}
        {error && <div className="rounded-2xl border border-[var(--stamp)]/30 bg-[var(--stamp-tint)] p-6 text-center text-[var(--stamp)]">{error}</div>}
        {member && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--green-tint)] text-[var(--green-deep)] text-xs font-semibold mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" /> Official verified member
              </div>
              <h1 className="font-display text-2xl font-bold text-[var(--ink)]">{member.full_name}</h1>
              <p className="text-sm text-[var(--ink-soft)] mt-1 font-mono">{member.membership_id}</p>
            </div>
            <MembershipCard name={member.full_name} dob={member.dob} state={member.state || ""} idNumber={member.id_number} photo={member.photo_url || null} membershipId={member.membership_id} issued={true} />
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Date of birth</span><span className="font-medium text-[var(--ink)]">{new Date(member.dob + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span></div>
              <div className="flex justify-between"><span className="text-[var(--ink-soft)]">State</span><span className="font-medium text-[var(--ink)]">{member.state || "—"}</span></div>
              <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Registered</span><span className="font-medium text-[var(--ink)]">{new Date(member.registered_at).toLocaleDateString("en-GB")}</span></div>
              <div className="flex justify-between"><span className="text-[var(--ink-soft)]">Status</span><span className="font-medium text-[var(--green)]">Verified</span></div>
            </div>
            <p className="text-center text-xs text-[var(--ink-soft)]">This page is publicly accessible via the QR code on the membership card.</p>
          </div>
        )}
      </main>
    </div>
  );
}
