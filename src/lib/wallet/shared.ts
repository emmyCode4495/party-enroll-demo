import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";

export type WalletMember = {
  membershipId: string;
  fullName: string;
  state: string;
  registeredAt: string;
};

/** Accepts a PEM, a PEM with literal "\n" sequences, or a base64-encoded PEM (easiest to paste into hosting dashboards). */
export function readPem(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/\\n/g, "\n");
  if (v.includes("-----BEGIN")) return v;
  try {
    const decoded = Buffer.from(v, "base64").toString("utf8");
    return decoded.includes("-----BEGIN") ? decoded : undefined;
  } catch {
    return undefined;
  }
}

export function appleConfigured() {
  return Boolean(
    process.env.APPLE_PASS_TYPE_ID &&
      process.env.APPLE_TEAM_ID &&
      readPem(process.env.APPLE_WWDR_CERT) &&
      readPem(process.env.APPLE_SIGNER_CERT) &&
      readPem(process.env.APPLE_SIGNER_KEY) &&
      process.env.WALLET_LINK_SECRET
  );
}

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
      readPem(process.env.GOOGLE_WALLET_PRIVATE_KEY)
  );
}

/** Public base URL of the site, used for the QR code and the pass logo. */
export function appOrigin(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

/** Looks up the signed-in user's membership from the Supabase access token sent by the browser. */
export async function memberFromRequest(req: Request): Promise<WalletMember | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return null;
  const { data } = await supabase
    .from("members")
    .select("membership_id, full_name, state, registered_at")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    membershipId: data.membership_id,
    fullName: data.full_name,
    state: data.state || "",
    registeredAt: data.registered_at,
  };
}

/* Short-lived signed link so the browser can open the .pkpass with a plain navigation (Safari needs that to show "Add to Wallet"). */

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signTicket(member: WalletMember, ttlSeconds = 120): string {
  const body = b64url(JSON.stringify({ m: member, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const sig = createHmac("sha256", process.env.WALLET_LINK_SECRET || "").update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyTicket(ticket: string | null): WalletMember | null {
  if (!ticket || !process.env.WALLET_LINK_SECRET) return null;
  const [body, sig] = ticket.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", process.env.WALLET_LINK_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now() / 1000) return null;
    return parsed.m as WalletMember;
  } catch {
    return null;
  }
}

export function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const BRAND = {
  name: "New Patriotic Party",
  blueHex: "#0b3b9c",
  blueRgb: "rgb(11, 59, 156)",
};
