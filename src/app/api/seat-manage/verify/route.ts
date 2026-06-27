import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const expected = process.env.SEAT_MANAGE_PIN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SEAT_MANAGE_PIN not configured" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: String(pin) === expected });
}
