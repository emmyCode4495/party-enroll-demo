import { NextResponse } from "next/server";
import { appleConfigured, googleConfigured } from "@/lib/wallet/shared";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ apple: appleConfigured(), google: googleConfigured() });
}
