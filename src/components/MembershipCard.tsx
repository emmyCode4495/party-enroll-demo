"use client";

import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

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
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${membershipId}`
      : `/verify/${membershipId}`;

  return (
    <div
      className="member-card"
      data-state={issued ? "issued" : "draft"}
      role="img"
      aria-label={
        issued
          ? `Verified membership card for ${name}, number ${membershipId}`
          : "Preview of your membership card."
      }
    >
      <div className="absolute inset-0 flex flex-col justify-between p-[5%]">
        {/* Top: brand + portrait + QR */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-[0.5em] min-w-0">
            <svg viewBox="0 0 32 32" className="h-[1.8em] w-[1.8em] shrink-0" style={{ fontSize: "clamp(10px, 3.2cqw, 14px)" }}>
              <rect width="32" height="32" rx="8" fill="#d9a431" />
              <text x="16" y="22" textAnchor="middle" fill="#08382b" fontSize="16" fontWeight="800" fontFamily="system-ui">
                U
              </text>
            </svg>
            <div className="min-w-0">
              <div className="font-display font-bold leading-none truncate" style={{ fontSize: "clamp(10px, 3.5cqw, 15px)" }}>
                UNITY PARTY
              </div>
              <div className="opacity-60 leading-none mt-[0.2em]" style={{ fontSize: "clamp(7px, 2.2cqw, 10px)" }}>
                Official Member
              </div>
            </div>
          </div>

          <div className="flex items-start gap-[0.4em] shrink-0">
            {/* Face portrait */}
            <div
              className="rounded-lg overflow-hidden border-2 border-[rgba(217,164,49,0.55)] bg-[rgba(0,0,0,0.25)] shrink-0"
              style={{ width: "clamp(44px, 16cqw, 68px)", height: "clamp(52px, 19cqw, 80px)" }}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className="h-full w-full object-cover object-center" />
              ) : (
                <div className="h-full w-full flex items-center justify-center opacity-40">
                  <svg viewBox="0 0 24 24" className="w-[45%] h-[45%]" fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}
            </div>

            {issued && membershipId && (
              <div
                className="bg-white rounded-md p-[3px] shrink-0"
                style={{ width: "clamp(44px, 16cqw, 68px)", height: "clamp(44px, 16cqw, 68px)" }}
              >
                <QRCodeSVG
                  value={verifyUrl}
                  size={256}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#08382b"
                  style={{ width: "100%", height: "100%" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Name + details */}
        <div className="mt-[3%]">
          <div className="card-name truncate">{name || "Your name"}</div>
          <div className="mt-[0.55em] grid grid-cols-2 gap-x-[1em] gap-y-[0.35em]">
            <div>
              <div className="card-label">Date of birth</div>
              <div className="card-value">{dobText || "—"}</div>
            </div>
            <div>
              <div className="card-label">State</div>
              <div className="card-value truncate">{state || "—"}</div>
            </div>
            <div>
              <div className="card-label">ID number</div>
              <div className="card-value font-mono">{idText || "—"}</div>
            </div>
            <div>
              <div className="card-label">Member ID</div>
              <div className="card-value font-mono truncate">{membershipId || "—"}</div>
            </div>
          </div>
        </div>

        {/* Barcode */}
        <div className="mt-auto pt-[2.5%]">
          <div className="h-[0.85em] text-[var(--brass)] opacity-80">
            <Bars seed={membershipId || name || "UNITY"} />
          </div>
        </div>
      </div>

      {issued && <div className="card-stamp">VERIFIED</div>}
    </div>
  );
}
