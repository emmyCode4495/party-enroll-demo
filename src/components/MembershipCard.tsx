"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Logo from "./Logo";

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
    const s = seed || "NEWPATRIOTICPARTY";
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

/** 1D barcode-style strip for the back of the card */
function BackBarcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    const s = code || "00000000";
    for (let i = 0; i < 48; i++) {
      const c = s.charCodeAt(i % s.length) + i * 3;
      out.push(1 + (c % 3));
    }
    return out;
  }, [code]);

  return (
    <div className="flex items-end gap-[1.5px] h-10 w-full px-1" aria-hidden="true">
      {bars.map((w, i) => (
        <div
          key={i}
          className="bg-[#111] rounded-[0.5px]"
          style={{ width: w, height: `${60 + (i % 5) * 8}%` }}
        />
      ))}
    </div>
  );
}

export default function MembershipCard({
  name,
  dob,
  state,
  idNumber,
  photo,
  membershipId,
  issued,
}: Props) {
  const [flipped, setFlipped] = useState(false);
  const dobText = formatDob(dob);
  const idText = maskId(idNumber);
  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${membershipId}`
      : `/verify/${membershipId}`;

  const toggle = () => setFlipped((f) => !f);

  return (
    <div className="w-full">
      <div
        className={`card-flip ${flipped ? "is-flipped" : ""}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={
          flipped
            ? "Membership card back. Click to show front."
            : "Membership card front. Click to show back."
        }
      >
        <div className="card-flip-inner">
          {/* ========== FRONT ========== */}
          <div
            className="member-card card-face card-face-front"
            data-state={issued ? "issued" : "draft"}
          >
            {membershipId ? (
              <div className="card-watermark" aria-hidden="true">
                <span>{membershipId}</span>
                <span>{membershipId}</span>
              </div>
            ) : null}
            <div className="absolute inset-0 flex flex-col justify-between p-[5%] z-[1]">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-[0.5em] min-w-0">
                  <span
                    className="flex shrink-0 items-center justify-center rounded-md bg-white p-[2px]"
                    style={{ fontSize: "clamp(10px, 3.2cqw, 14px)", width: "2.6em", height: "2.6em" }}
                  >
                    <Logo className="h-full w-full" />
                  </span>
                  <div className="min-w-0">
                    <div
                      className="font-display font-bold leading-none truncate"
                      style={{ fontSize: "clamp(10px, 3.5cqw, 15px)" }}
                    >
                      NEW PATRIOTIC PARTY
                    </div>
                    <div
                      className="opacity-60 leading-none mt-[0.2em]"
                      style={{ fontSize: "clamp(7px, 2.2cqw, 10px)" }}
                    >
                      Official Member
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-[0.4em] shrink-0">
                  <div
                    className="rounded-lg overflow-hidden border-2 border-[rgba(255,255,255,0.6)] bg-[rgba(0,0,0,0.25)] shrink-0"
                    style={{
                      width: "clamp(44px, 16cqw, 68px)",
                      height: "clamp(52px, 19cqw, 80px)",
                    }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt=""
                        className="h-full w-full object-cover object-center"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center opacity-40">
                        <svg
                          viewBox="0 0 24 24"
                          className="w-[45%] h-[45%]"
                          fill="currentColor"
                        >
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {issued && membershipId && (
                    <div
                      className="bg-white rounded-md p-[3px] shrink-0"
                      style={{
                        width: "clamp(44px, 16cqw, 68px)",
                        height: "clamp(44px, 16cqw, 68px)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <QRCodeSVG
                        value={verifyUrl}
                        size={256}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#071f5c"
                        style={{ width: "100%", height: "100%" }}
                      />
                    </div>
                  )}
                </div>
              </div>

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
                    <div className="card-value font-mono truncate">
                      {membershipId || "—"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-[2.5%]">
                <div className="h-[0.85em] text-white opacity-60">
                  <Bars seed={membershipId || name || "NPP"} />
                </div>
              </div>
            </div>

            <div className="tricolour" aria-hidden="true" />

            {issued && <div className="card-stamp">VERIFIED</div>}
          </div>

          {/* ========== BACK ========== */}
          <div className="member-card-back card-face card-face-back">
            {membershipId ? (
              <div className="card-watermark card-watermark-back" aria-hidden="true">
                <span>{membershipId}</span>
                <span>{membershipId}</span>
              </div>
            ) : null}
            {/* Magnetic stripe */}
            <div className="card-magstripe relative z-[1]" aria-hidden="true" />

            <div className="relative z-[1] flex flex-col flex-1 px-[5%] pt-3 pb-[4%] justify-between">
              {/* Signature panel */}
              <div>
                <div className="card-sign-strip">
                  <span className="card-sign-label">Authorized signature</span>
                  <span className="card-sign-line">{name || ""}</span>
                </div>

                <p className="mt-3 text-[clamp(7px,2.1cqw,10px)] leading-snug text-[#333] opacity-90">
                  This card remains the property of the New Patriotic Party. If found, please return to any
                  party office or visit the verification page via the QR code on the front.
                </p>
              </div>

              {/* Machine-readable + barcode */}
              <div className="mt-2">
                <div className="bg-white rounded-md border border-[#ccc] px-2 py-1.5">
                  <BackBarcode code={membershipId || idNumber || "NPP"} />
                  <p className="text-center font-mono text-[clamp(8px,2.4cqw,11px)] text-[#111] tracking-wider mt-1">
                    {membershipId || "—"}
                  </p>
                </div>

                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-[clamp(7px,2cqw,9px)] text-[#444] leading-tight max-w-[55%]">
                    <p className="font-semibold text-[#222]">New Patriotic Party · Membership</p>
                    <p>Not a government ID. For party identification only.</p>
                  </div>
                  <div className="text-right text-[clamp(7px,2cqw,9px)] text-[#555] font-mono">
                    <p>REF {maskId(idNumber)}</p>
                    <p className="opacity-70">CLICK TO FLIP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--ink-soft)]">
        Click the card to flip · {flipped ? "Showing back" : "Showing front"}
      </p>
    </div>
  );
}
