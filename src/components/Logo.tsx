"use client";

import { useState } from "react";

/** Drop the official logo file at /public/npp-logo.png (see README). */
export const LOGO_SRC = "/npp-logo.png";

type Props = {
  /** Tailwind size classes for the logo box */
  className?: string;
  /** Show the party name next to the logo */
  withName?: boolean;
  nameClassName?: string;
};

export default function Logo({
  className = "h-9 w-9",
  withName = false,
  nameClassName = "",
}: Props) {
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center gap-2.5">
      {failed ? (
        <span
          className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-[var(--blue)] text-[10px] font-bold tracking-wide text-white`}
          aria-hidden="true"
        >
          NPP
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={LOGO_SRC}
          alt={withName ? "" : "New Patriotic Party"}
          className={`${className} shrink-0 object-contain`}
          onError={() => setFailed(true)}
        />
      )}
      {withName && (
        <span className={`font-display font-bold tracking-tight text-[var(--ink)] ${nameClassName}`}>
          New Patriotic Party
        </span>
      )}
    </span>
  );
}
