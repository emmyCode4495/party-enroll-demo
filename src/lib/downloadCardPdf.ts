"use client";

import { PDFDocument, StandardFonts, rgb, degrees } from "@cantoo/pdf-lib";
export type CardPdfData = {
  fullName: string;
  dob: string;
  state: string;
  idNumber: string;
  membershipId: string;
  photoUrl?: string | null;
  registeredAt?: string;
};

/** Last 4 characters of membership ID (password for the PDF). */
export function cardPassword(membershipId: string): string {
  const clean = (membershipId || "").replace(/\s/g, "");
  return clean.slice(-4).toUpperCase();
}

function formatDob(dob: string) {
  if (!dob) return "—";
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function maskId(id: string) {
  const clean = id.trim();
  if (!clean) return "—";
  if (clean.length <= 4) return clean;
  return "•".repeat(Math.min(clean.length - 4, 8)) + clean.slice(-4);
}

/**
 * Build an encrypted membership card PDF.
 * Password = last 4 characters of membershipId.
 */
export async function downloadEncryptedCardPdf(data: CardPdfData): Promise<void> {
  const password = cardPassword(data.membershipId);
  if (password.length < 4) {
    throw new Error("Membership ID is too short to derive a password.");
  }

  const pdfDoc = await PDFDocument.create();
  // Credit-card-ish landscape page (points)
  const pageWidth = 486; // ~6.75 in
  const pageHeight = 306; // ~4.25 in
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Dark green background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(0.031, 0.22, 0.169), // #08382b
  });

  // Subtle lighter panel
  page.drawRectangle({
    x: 14,
    y: 14,
    width: pageWidth - 28,
    height: pageHeight - 28,
    color: rgb(0.047, 0.29, 0.216),
    borderColor: rgb(0.85, 0.64, 0.19),
    borderWidth: 0.8,
    opacity: 0.35,
    borderOpacity: 0.4,
  });

  // Brand mark
  page.drawRectangle({
    x: 28,
    y: pageHeight - 58,
    width: 28,
    height: 28,
    color: rgb(0.85, 0.64, 0.19),
  });
  page.drawText("U", {
    x: 35,
    y: pageHeight - 50,
    size: 16,
    font: fontBold,
    color: rgb(0.031, 0.22, 0.169),
  });

  page.drawText("UNITY PARTY", {
    x: 64,
    y: pageHeight - 42,
    size: 13,
    font: fontBold,
    color: rgb(0.95, 0.97, 0.95),
  });
  page.drawText("Official Member", {
    x: 64,
    y: pageHeight - 56,
    size: 9,
    font,
    color: rgb(0.75, 0.85, 0.8),
  });

  // Portrait (if available)
  let portraitDrawn = false;
  if (data.photoUrl && data.photoUrl.startsWith("data:image")) {
    try {
      const base64 = data.photoUrl.split(",")[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      const isPng = data.photoUrl.includes("image/png");
      const img = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
      const pw = 72;
      const ph = 86;
      page.drawImage(img, {
        x: pageWidth - 28 - pw - 78,
        y: pageHeight - 28 - ph,
        width: pw,
        height: ph,
      });
      // gold border
      page.drawRectangle({
        x: pageWidth - 28 - pw - 78,
        y: pageHeight - 28 - ph,
        width: pw,
        height: ph,
        borderColor: rgb(0.85, 0.64, 0.19),
        borderWidth: 1.5,
      });
      portraitDrawn = true;
    } catch (e) {
      console.warn("Could not embed portrait", e);
    }
  }

  if (!portraitDrawn) {
    const pw = 72;
    const ph = 86;
    const x = pageWidth - 28 - pw - 78;
    const y = pageHeight - 28 - ph;
    page.drawRectangle({
      x,
      y,
      width: pw,
      height: ph,
      color: rgb(0.02, 0.15, 0.12),
      borderColor: rgb(0.85, 0.64, 0.19),
      borderWidth: 1.5,
    });
  }

  // QR hint box (visual placeholder — real QR is on web card)
  page.drawRectangle({
    x: pageWidth - 28 - 64,
    y: pageHeight - 28 - 64,
    width: 64,
    height: 64,
    color: rgb(1, 1, 1),
  });
  page.drawText("QR", {
    x: pageWidth - 28 - 44,
    y: pageHeight - 28 - 40,
    size: 12,
    font: fontBold,
    color: rgb(0.031, 0.22, 0.169),
  });
  page.drawText("on web", {
    x: pageWidth - 28 - 52,
    y: pageHeight - 28 - 54,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Name
  page.drawText(data.fullName || "Member", {
    x: 28,
    y: pageHeight - 110,
    size: 22,
    font: fontBold,
    color: rgb(0.98, 0.99, 0.98),
  });

  // Fields
  const labelColor = rgb(0.65, 0.78, 0.72);
  const valueColor = rgb(0.95, 0.97, 0.95);
  const row1 = pageHeight - 150;
  const row2 = pageHeight - 190;

  page.drawText("Date of birth", { x: 28, y: row1 + 14, size: 8, font, color: labelColor });
  page.drawText(formatDob(data.dob), { x: 28, y: row1, size: 12, font: fontBold, color: valueColor });

  page.drawText("State", { x: 200, y: row1 + 14, size: 8, font, color: labelColor });
  page.drawText(data.state || "—", { x: 200, y: row1, size: 12, font: fontBold, color: valueColor });

  page.drawText("ID number", { x: 28, y: row2 + 14, size: 8, font, color: labelColor });
  page.drawText(maskId(data.idNumber), { x: 28, y: row2, size: 12, font: fontBold, color: valueColor });

  page.drawText("Member ID", { x: 200, y: row2 + 14, size: 8, font, color: labelColor });
  page.drawText(data.membershipId, { x: 200, y: row2, size: 12, font: fontBold, color: valueColor });

  // VERIFIED stamp
  page.drawRectangle({
    x: pageWidth - 130,
    y: 40,
    width: 90,
    height: 28,
    borderColor: rgb(0.85, 0.64, 0.19),
    borderWidth: 2,
  });
  page.drawText("VERIFIED", {
    x: pageWidth - 118,
    y: 48,
    size: 12,
    font: fontBold,
    color: rgb(0.85, 0.64, 0.19),
    rotate: degrees(-8),
  });

  // Footer note
  page.drawText(`Password: last 4 of Member ID  ·  ${data.membershipId}`, {
    x: 28,
    y: 22,
    size: 7,
    font,
    color: rgb(0.55, 0.7, 0.65),
  });

  // Encrypt — user must enter last 4 of membership ID
  await pdfDoc.encrypt({
    userPassword: password,
    ownerPassword: password + "-UP-OWNER",
    permissions: {
      printing: "highResolution",
      modifying: false,
      copying: false,
      annotating: false,
      fillingForms: false,
      contentAccessibility: true,
      documentAssembly: false,
    },
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `UnityParty-${data.membershipId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
