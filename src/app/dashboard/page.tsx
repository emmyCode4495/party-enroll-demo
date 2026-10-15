"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, type Member } from "@/lib/supabase";
import MembershipCard from "@/components/MembershipCard";
import AddToWallet from "@/components/AddToWallet";
import { downloadEncryptedCardPdf, cardPassword } from "@/lib/downloadCardPdf";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/auth?mode=signin");
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setMember(data);
      setLoading(false);
    };
    init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace("/auth?mode=signin");
      else setUser(session.user);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleDownloadPdf = async () => {
    if (!member) return;
    setDownloading(true);
    setDownloadMsg(null);
    try {
      const pwd = cardPassword(member.membership_id);
      await downloadEncryptedCardPdf({
        fullName: member.full_name,
        dob: member.dob,
        state: member.state || "",
        idNumber: member.id_number,
        membershipId: member.membership_id,
        photoUrl: member.photo_url,
        registeredAt: member.registered_at,
      });
      setDownloadMsg(
        `PDF downloaded. Open it with password: ${pwd} (last 4 of your Member ID)`
      );
    } catch (err: any) {
      console.error(err);
      setDownloadMsg(err.message || "Could not create PDF. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--ink-soft)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9" withName />
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--ink-soft)] hidden sm:inline">{user?.email}</span>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/");
              }}
              className="btn btn-quiet text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-10">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-[var(--ink)] mb-2">
          Your membership
        </h1>
        <p className="text-[var(--ink-soft)] mb-8">
          {member
            ? "You are a verified member. Scan the QR on your card to show credentials, or download an encrypted PDF."
            : "You have not enrolled yet. Complete enrolment to receive your digital card."}
        </p>

        {member ? (
          <div className="max-w-md mx-auto space-y-6">
            <MembershipCard
              name={member.full_name}
              dob={member.dob}
              state={member.state || ""}
              idNumber={member.id_number}
              photo={member.photo_url || null}
              membershipId={member.membership_id}
              issued={true}
            />

            <div className="text-center space-y-3">
              <p className="text-sm text-[var(--ink-soft)]">
                Membership ID:{" "}
                <span className="font-mono text-[var(--ink)]">{member.membership_id}</span>
              </p>

              {!member.photo_url && (
                <p className="text-xs text-[var(--ink-soft)]">
                  No portrait on this card — enrol again after face photos were enabled to include
                  your face.
                </p>
              )}

              <AddToWallet className="pt-1" />

              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="btn btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
                >
                  {downloading ? "Preparing PDF…" : "Download encrypted PDF"}
                </button>
                <Link
                  href={`/verify/${member.membership_id}`}
                  className="btn btn-secondary px-5 py-2.5 text-sm"
                  target="_blank"
                >
                  Open verification page
                </Link>
              </div>

              {downloadMsg && (
                <div className="mt-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--ink)]">
                  {downloadMsg}
                </div>
              )}

              <p className="text-xs text-[var(--ink-soft)] max-w-sm mx-auto pt-1">
                The PDF is password-protected. Use the{" "}
                <strong className="text-[var(--ink)]">last 4 characters</strong> of your Member ID
                as the password
                {member.membership_id ? (
                  <>
                    {" "}
                    (<span className="font-mono text-[var(--blue)]">
                      ({cardPassword(member.membership_id)})
                    </span>
                  </>
                ) : null}
                .
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-8 text-center max-w-lg mx-auto">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--blue-tint)] flex items-center justify-center">
              <svg
                className="w-7 h-7 text-[var(--blue)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl text-[var(--ink)] mb-2">Start enrolment</h2>
            <p className="text-sm text-[var(--ink-soft)] mb-6">
              You’ll upload your official ID and match your face. Each ID document can only be used
              once.
            </p>
            <Link href="/enrol" className="btn btn-primary px-8 py-3">
              Begin enrolment
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
