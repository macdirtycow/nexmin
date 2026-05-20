import { clearSessionCookieOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const jar = await cookies();
  jar.set(clearSessionCookieOptions());
  return NextResponse.json({ ok: true });
}
