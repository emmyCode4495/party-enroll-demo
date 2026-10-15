import { createSign } from "crypto";
import { BRAND, memberSince, readPem, type WalletMember } from "./shared";

const text = (value: string) => ({ defaultValue: { language: "en-GB", value } });

/** Builds a "Save to Google Wallet" link. The pass class and object travel inside the signed JWT, so no API calls are needed. */
export function buildGoogleSaveUrl(member: WalletMember, origin: string): string {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID!;
  const email = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL!;
  const key = readPem(process.env.GOOGLE_WALLET_PRIVATE_KEY)!;

  const classId = `${issuerId}.npp_membership`;
  const objectId = `${issuerId}.${member.membershipId.replace(/[^A-Za-z0-9._-]/g, "_")}`;
  const verifyUrl = `${origin}/verify/${member.membershipId}`;
  const logoIsPublic = origin.startsWith("https://");

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: "ACTIVE",
    hexBackgroundColor: BRAND.blueHex,
    cardTitle: text(BRAND.name),
    subheader: text("Member"),
    header: text(member.fullName),
    textModulesData: [
      { id: "member_id", header: "MEMBER ID", body: member.membershipId },
      ...(member.state ? [{ id: "state", header: "STATE", body: member.state }] : []),
      { id: "since", header: "MEMBER SINCE", body: memberSince(member.registeredAt) },
    ],
    barcode: { type: "QR_CODE", value: verifyUrl, alternateText: member.membershipId },
    linksModuleData: { uris: [{ id: "verify", description: "Verify this membership", uri: verifyUrl }] },
  };
  // Google fetches the logo itself, so it must be a public https URL (not localhost).
  if (logoIsPublic) genericObject.logo = { sourceUri: { uri: `${origin}/npp-logo.png` }, contentDescription: text(BRAND.name) };

  const claims = {
    iss: email,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    origins: [origin],
    payload: {
      genericClasses: [{ id: classId }],
      genericObjects: [genericObject],
    },
  };

  const b64 = (v: object) => Buffer.from(JSON.stringify(v)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  return `https://pay.google.com/gp/v/save/${unsigned}.${signature}`;
}
