import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";
export async function POST(request: Request) {
  const access = await coachApiAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.member.role !== "TEAM_ADMIN") return NextResponse.json({ error: "Only a team admin can update the logo." }, { status: 403 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 750000) return NextResponse.json({ error: "Logo is too large." }, { status: 413 });
  let input;
  try { input = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid logo data." }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid logo data." }, { status: 400 });
  if (input.teamId !== access.member.teamId) return NextResponse.json({ error: "Your active team changed. Refresh and try again." }, { status: 409 });
  const logo = input.logoData;
  if (logo !== null) {
    if (typeof logo !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(logo)) return NextResponse.json({ error: "Choose a PNG, JPG or WebP image." }, { status: 400 });
    const bytes = Buffer.from(logo.split(",")[1], "base64");
    if (bytes.length < 24 || bytes.length > 512000 || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || bytes.subarray(12, 16).toString() !== "IHDR" || bytes.readUInt32BE(16) > 512 || bytes.readUInt32BE(20) > 512 || !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20)) return NextResponse.json({ error: "Choose a valid logo image up to 512 × 512 pixels." }, { status: 400 });
  }
  await db.team.update({ where: { id: access.member.teamId }, data: { logoData: logo } });
  revalidatePath("/", "layout");
  return NextResponse.json({ saved: true });
}
