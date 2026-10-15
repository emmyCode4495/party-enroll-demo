import { PKPass } from "passkit-generator";
import { BRAND, memberSince, readPem, type WalletMember } from "./shared";

async function loadLogo(origin: string): Promise<Buffer> {
  const res = await fetch(`${origin}/npp-logo.png`);
  if (!res.ok) throw new Error("Put the party logo at public/npp-logo.png so it can be used on the pass.");
  return Buffer.from(await res.arrayBuffer());
}

export async function buildApplePass(member: WalletMember, origin: string): Promise<Buffer> {
  const logo = await loadLogo(origin);

  const pass = new PKPass(
    { "icon.png": logo, "icon@2x.png": logo, "logo.png": logo, "logo@2x.png": logo },
    {
      wwdr: readPem(process.env.APPLE_WWDR_CERT)!,
      signerCert: readPem(process.env.APPLE_SIGNER_CERT)!,
      signerKey: readPem(process.env.APPLE_SIGNER_KEY)!,
      signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
    },
    {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID!,
      teamIdentifier: process.env.APPLE_TEAM_ID!,
      organizationName: BRAND.name,
      description: `${BRAND.name} membership card`,
      serialNumber: member.membershipId,
      logoText: BRAND.name,
      backgroundColor: BRAND.blueRgb,
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(190, 205, 240)",
    }
  );

  pass.type = "generic";
  const verifyUrl = `${origin}/verify/${member.membershipId}`;

  if (member.state) pass.headerFields.push({ key: "state", label: "STATE", value: member.state });
  pass.primaryFields.push({ key: "name", label: "MEMBER", value: member.fullName });
  pass.secondaryFields.push({ key: "mid", label: "MEMBER ID", value: member.membershipId });
  pass.auxiliaryFields.push(
    { key: "since", label: "MEMBER SINCE", value: memberSince(member.registeredAt) },
    { key: "status", label: "STATUS", value: "Verified" }
  );
  pass.backFields.push(
    { key: "verify", label: "Verify this membership", value: verifyUrl },
    { key: "about", label: "About", value: `Official ${BRAND.name} membership card. Scan the QR code to confirm the member's details.` }
  );
  pass.setBarcodes({
    message: verifyUrl,
    format: "PKBarcodeFormatQR",
    messageEncoding: "iso-8859-1",
    altText: member.membershipId,
  });

  return pass.getAsBuffer();
}
