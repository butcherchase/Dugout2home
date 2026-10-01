import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ teamId: z.string().min(1).max(100), containsUnder13Data: z.boolean() });

export async function POST(request: Request) {
  const access = await coachApiAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.member.role !== "TEAM_ADMIN") return NextResponse.json({ error: "Only a team admin can change this disclosure." }, { status: 403 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid disclosure data." }, { status: 400 }); }
  const input = schema.safeParse(json);
  if (!input.success) return NextResponse.json({ error: "Choose whether this team will store information about children under 13." }, { status: 400 });
  if (input.data.teamId !== access.member.teamId) return NextResponse.json({ error: "Your active team changed. Refresh and try again." }, { status: 409 });
  try {
    const updated = await db.team.update({
      where: { id: access.member.teamId },
      data: {
        containsUnder13Data: input.data.containsUnder13Data,
        under13DisclosureUpdatedAt: new Date(),
        under13DisclosureUpdatedBy: access.member.userId
      },
      select: { containsUnder13Data: true, under13DisclosureUpdatedAt: true }
    });
    revalidatePath("/team");
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Team disclosure save failed", error);
    return NextResponse.json({ error: "The disclosure could not be saved. Please try again." }, { status: 500 });
  }
}
