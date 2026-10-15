import { NextResponse } from "next/server";
import { buildGoogleSaveUrl } from "@/lib/wallet/google";
import { appOrigin, googleConfigured, memberFromRequest } from "@/lib/wallet/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Google Wallet isn't set up on this site yet." }, { status: 501 });
  }
  const member = await memberFromRequest(req);
  if (!member) return NextResponse.json({ error: "Sign in and enrol first." }, { status: 401 });
  try {
    return NextResponse.json({ url: buildGoogleSaveUrl(member, appOrigin(req)) });
  } catch (e: any) {
    console.error("Google pass error", e);
    return NextResponse.json({ error: "Could not create the Google Wallet pass." }, { status: 500 });
  }
}
