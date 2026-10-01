import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { recoverySchema } from "@/lib/development-recovery";
import { recoverDevelopment } from "@/lib/recover-development";
import { mergeDetails } from "@/lib/player-observations";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("preview"), teamId: z.string().min(1).max(100) }),
  z.object({ action: z.literal("save"), teamId: z.string().min(1).max(100), revision: z.string().regex(/^[a-f0-9]{64}$/), players: recoverySchema.shape.players })
]);
const revisionFor = (game: unknown) => createHash("sha256").update(JSON.stringify(game)).digest("hex");
const include = { playerLines: { orderBy: { id: "asc" as const }, include: { player: { select: { id: true, teamId: true, firstName: true, lastName: true } } } } };
const error = (message: string, status: number) => NextResponse.json({ error: message }, { status });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await coachApiAccess(request);
  if ("error" in access) return error(access.error ?? "Coach access is required.", access.status ?? 403);
  const { id } = await context.params;
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 2 * 1024 * 1024) return error("Development data is too large.", 413);
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return error("Invalid development data.", 400); }
  const parsed = requestSchema.safeParse(json);
  if (!parsed.success) return error("Check the development preview and try again.", 400);
  const input = parsed.data, teamId = access.member.teamId;
  if (input.teamId !== teamId) return error("Your active team changed. Refresh this page.", 409);

  try {
    if (input.action === "preview") {
      const game = await db.game.findFirst({ where: { id, teamId }, include });
      if (!game) return error("Game not found on this team.", 404);
      if (!game.playerLines.length || game.playerLines.length > 100) return error("This game needs 1–100 matched roster players before development can be refreshed.", 400);
      if (game.playerLines.some(l => l.player.teamId !== teamId)) return error("A roster match needs review before continuing.", 400);
      if (!process.env.OPENAI_API_KEY) return error("OPENAI_API_KEY is not configured.", 503);
      const playerIds = game.playerLines.map(l => l.playerId);
      const recovered = await recoverDevelopment({ team: access.member.team.name, opponent: game.opponent, date: game.playedAt,
        savedAnalysis: game.aiSummary, rosterResults: game.playerLines.map(l => ({
          playerId: l.playerId, rosterName: `${l.player.firstName} ${l.player.lastName ?? ""}`.trim(),
          plateAppearances: l.plateAppearances, hits: l.hits, walks: l.walks, strikeouts: l.strikeouts,
          runs: l.runs, rbi: l.rbi, notes: l.notes, alreadyRecorded: l.details
        }))
      }, playerIds);
      // Do not trust model IDs, duplicates, or incomplete rosters even with a strict schema.
      const validated = recoverySchema.parse(recovered);
      if (validated.players.length !== playerIds.length || new Set(validated.players.map(p => p.playerId)).size !== playerIds.length || validated.players.some(p => !playerIds.includes(p.playerId))) return error("The analysis did not match the saved roster. Please try again.", 502);
      return NextResponse.json({ revision: revisionFor(game), players: validated.players.map(p => {
        const line = game.playerLines.find(l => l.playerId === p.playerId)!;
        return { ...p, name: `${line.player.firstName} ${line.player.lastName ?? ""}`.trim(), previousDetails: line.details, details: mergeDetails(line.details, p.details) };
      }) });
    }

    const result = await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
      const game = await tx.game.findFirst({ where: { id, teamId }, include });
      if (!game) return { status: 404, message: "Game not found on this team." };
      if (revisionFor(game) !== input.revision) return { status: 409, message: "This game changed after the preview. Generate a fresh preview before saving." };
      const ids = game.playerLines.map(l => l.playerId);
      if (input.players.length !== ids.length || new Set(input.players.map(p => p.playerId)).size !== ids.length || input.players.some(p => !ids.includes(p.playerId)) || game.playerLines.some(l => l.player.teamId !== teamId)) return { status: 400, message: "Development rows must match this game's roster exactly." };
      for (const row of input.players) {
        const line = game.playerLines.find(l => l.playerId === row.playerId)!;
        await tx.playerGameLine.update({ where: { id: line.id }, data: { details: mergeDetails(line.details, row.details) as Prisma.InputJsonValue } });
      }
      await tx.game.update({ where: { id: game.id }, data: { updatedAt: new Date() } });
      return { status: 200, message: "Development updated. Game totals are unchanged." };
    });
    if (result.status !== 200) return error(result.message, result.status);
    revalidatePath("/players", "layout"); revalidatePath(`/recaps/games/${id}`);
    return NextResponse.json({ saved: true, message: result.message });
  } catch (cause) {
    console.error("Development recovery failed", cause);
    return error("Could not refresh development. No partial update was saved. Please try again.", 500);
  }
}
