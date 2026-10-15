import { NextResponse } from "next/server";
import { buildApplePass } from "@/lib/wallet/apple";
import { appleConfigured, appOrigin, memberFromRequest, signTicket, verifyTicket } from "@/lib/wallet/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1: the signed-in browser asks for a one-time link to its own pass. */
export async function POST(req: Request) {
  if (!appleConfigured()) {
    return NextResponse.json({ error: "Apple Wallet isn't set up on this site yet." }, { status: 501 });
  }
  const member = await memberFromRequest(req);
  if (!member) return NextResponse.json({ error: "Sign in and enrol first." }, { status: 401 });
  return NextResponse.json({ url: `/api/wallet/apple?t=${encodeURIComponent(signTicket(member))}` });
}

/** Step 2: opening that link returns the .pkpass, which Safari offers to add to Wallet. */
export async function GET(req: Request) {
  if (!appleConfigured()) return new NextResponse("Apple Wallet isn't set up.", { status: 501 });
  const member = verifyTicket(new URL(req.url).searchParams.get("t"));
  if (!member) return new NextResponse("This link has expired. Go back and try again.", { status: 401 });
  try {
    const buffer = await buildApplePass(member, appOrigin(req));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="NPP-${member.membershipId}.pkpass"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("Apple pass error", e);
    return new NextResponse(e?.message || "Could not create the pass.", { status: 500 });
  }
}
