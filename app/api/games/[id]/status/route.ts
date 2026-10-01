import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ teamId: z.string().min(1).max(100), action: z.enum(["remove", "restore"]), version: z.string().datetime() });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await coachApiAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 2048) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid game request." }, { status: 400 }); }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Refresh the page and try again." }, { status: 400 });
  const input = parsed.data, teamId = access.member.teamId, { id } = await context.params;
  if (input.teamId !== teamId) return NextResponse.json({ error: "Your active team changed. Refresh the page." }, { status: 409 });
  try {
    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
      const game = await tx.game.findFirst({ where: { id, teamId } });
      if (!game) return { status: 404, error: "Game not found on this team." };
      // A repeated request is harmless; do not let an old tab reverse a later change.
      if ((input.action === "remove") === !!game.removedAt) return { status: 200 };
      if (game.updatedAt.toISOString() !== input.version) return { status: 409, error: "This game changed. Refresh it before continuing." };
      await tx.game.update({ where: { id }, data: {
        removedAt: input.action === "remove" ? new Date() : null,
        removedBy: input.action === "remove" ? access.member.userId : null
      } });
      return { status: 200 };
    });
    if (result.status !== 200) return NextResponse.json({ error: result.error }, { status: result.status });
    for (const path of ["/recaps", "/players", "/practice", "/dashboard", "/my-player"]) revalidatePath(path, "layout");
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Game status update failed", error);
    return NextResponse.json({ error: "Could not update this game. Please try again." }, { status: 500 });
  }
}
