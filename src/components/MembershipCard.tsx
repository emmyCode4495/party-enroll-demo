"use client";

import { useMemo } from "react";

type Props = {
  name: string;
  dob: string;
  state: string;
  idNumber: string;
  photo: string | null;
  membershipId: string;
  issued: boolean;
};

function maskId(id: string) {
  const clean = id.trim();
  if (!clean) return "";
  if (clean.length <= 4) return clean;
  return "•".repeat(Math.min(clean.length - 4, 8)) + clean.slice(-4);
}

function formatDob(dob: string) {
  if (!dob) return "";
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Deterministic barcode-style strip derived from the membership id. */
function Bars({ seed }: { seed: string }) {
  const bars = useMemo(() => {
    const out: { x: number; w: number }[] = [];
    let x = 0;
    const s = seed || "UNITYPARTY";
    for (let i = 0; i < 34; i++) {
      const code = s.charCodeAt(i % s.length) + i * 7;
      const w = 1 + (code % 3);
      out.push({ x, w });
      x += w + 1 + ((code >> 2) % 2);
    }
    return { items: out, width: x };
  }, [seed]);

  return (
    <svg viewBox={`0 0 ${bars.width} 16`} className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      {bars.items.map((b, i) => (
        <rect key={i} x={b.x} y={0} width={b.w} height={16} fill="currentColor" />
      ))}
    </svg>
  );
}

export default function MembershipCard({ name, dob, state, idNumber, photo, membershipId, issued }: Props) {
  const dobText = formatDob(dob);
  const idText = maskId(idNumber);

  return (
    <div
      className="member-card"
      data-state={issued ? "issued" : "draft"}
      role="img"
      aria-label={
        issued
          ? `Verified membership card for ${name}, number ${membershipId}`
          : "Preview of your membership card. It fills in as you complete each step."
      }
    >
      <div className="absolute inset-0 flex flex-col justify-between p-[6%]">
        {/* Top row: brand + status */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-[0.6em]">
            <svg viewBox="0 0 32 32" className="h-[2.2em] w-[2.2em]" style={{ fontSize: "clamp(9px, 3.2cqw, 14px)" }} aria-hidden="true">
              <circle cx="12" cy="16" r="9" fill="none" stroke="#d9a431" strokeWidth="2.5" />
              <circle cx="20" cy="16" r="9" fill="none" stroke="#f2f7f4" strokeWidth="2.5" />
            </svg>
            <div>
              <p className="card-name" style={{ fontSize: "clamp(11px, 4cqw, 17px)" }}>Unity Party</p>
              <p className="card-label">Member card</p>
            </div>
          </div>
          <p className="card-label text-right">{issued ? "Active" : "Not issued yet"}</p>
        </div>

        {/* Middle: photo + identity */}
        <div className="flex items-end gap-[5%]">
          <div
            className="relative aspect-[3/4] w-[24%] shrink-0 overflow-hidden rounded-[10px] border border-white/25 bg-white/10"
          >
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt="" className="h-full w-full object-cover" />
            ) : (
              <svg viewBox="0 0 30 40" className="h-full w-full opacity-40" aria-hidden="true">
                <circle cx="15" cy="15" r="6" fill="currentColor" />
                <path d="M3 40c0-9 5-14 12-14s12 5 12 14z" fill="currentColor" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`card-name truncate ${name ? "" : "opacity-40"}`}>{name || "Your full name"}</p>
            <dl className="mt-[4%] grid grid-cols-2 gap-x-[6%] gap-y-[3%]">
              <div className="min-w-0">
                <dt className="card-label">Born</dt>
                <dd className={`card-value truncate ${dobText ? "" : "opacity-40"}`}>{dobText || "—"}</dd>
              </div>
              <div className="min-w-0">
                <dt className="card-label">State</dt>
                <dd className={`card-value truncate ${state ? "" : "opacity-40"}`}>{state || "—"}</dd>
              </div>
              <div className="col-span-2 min-w-0">
                <dt className="card-label">ID number</dt>
                <dd className={`card-value font-mono truncate ${idText ? "" : "opacity-40"}`}>{idText || "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Bottom: membership number + barcode */}
        <div className="flex items-end justify-between gap-[6%]">
          <div className="min-w-0">
            <p className="card-label">Membership number</p>
            <p className={`card-value font-mono tracking-wider ${issued ? "" : "opacity-40"}`}>
              {membershipId || "UP-••••••••"}
            </p>
          </div>
          <div className="h-[9%] min-h-[14px] w-[30%] text-white/70">
            <Bars seed={membershipId} />
          </div>
        </div>
      </div>

      {issued && <div className="card-stamp">VERIFIED</div>}
    </div>
  );
}
