import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { importSchema, parseSeasonCsv, SeasonSnapshot } from "@/lib/season-csv";

export async function POST(request: Request) {
  const access = await coachApiAccess(request);
  if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
  const raw = await request.text();
  if (raw.length > 1500000) return NextResponse.json({ error: "CSV is too large (1 MB maximum)." }, { status: 413 });
  let input;
  try { input = importSchema.parse(JSON.parse(raw)); } catch { return NextResponse.json({ error: "Choose a season, categories and export coverage, and upload a CSV." }, { status: 400 }); }
  let players;
  try { players = parseSeasonCsv(input.csv); } catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid CSV." }, { status: 400 }); }
  const teamId = access.member.teamId;
  const season = await db.season.findFirst({ where: { id: input.seasonId, teamId } });
  if (!season) return NextResponse.json({ error: "Season not found on your team." }, { status: 404 });
  if (input.action === "preview") return NextResponse.json({ players, version: (season.csvSnapshot as SeasonSnapshot | null)?.version ?? null });
  const matches = input.matches ?? [];
  if (matches.length !== players.length || new Set(matches.map(m => m.row)).size !== players.length || matches.some(m => !players[m.row])) return NextResponse.json({ error: "Review every CSV player." }, { status: 400 });
  const selected = matches.filter(m => m.playerId);
  if (!selected.length || new Set(selected.map(m => m.playerId)).size !== selected.length) return NextResponse.json({ error: "Match at least one player. Each roster player can be matched only once." }, { status: 400 });
  try {
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;
      const current = await tx.season.findFirst({ where: { id: input.seasonId, teamId } });
      if (!current || ((current.csvSnapshot as SeasonSnapshot | null)?.version ?? null) !== (input.version ?? null)) throw new Error("STALE");
      const roster = await tx.player.count({ where: { teamId, active: true, id: { in: selected.map(m => m.playerId) } } });
      if (roster !== selected.length) throw new Error("ROSTER");
      const snapshot: SeasonSnapshot = { version: randomUUID(), importedAt: new Date().toISOString(), importedBy: access.member.userId, filename: input.filename, coverage: input.coverage, categories: [...new Set(input.categories)], players: selected.map(m => ({ ...players[m.row], playerId: m.playerId })) };
      await tx.season.update({ where: { id: current.id }, data: { csvSnapshot: snapshot as unknown as Prisma.InputJsonValue } });
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    return NextResponse.json({ error: message === "STALE" ? "This season changed. Build a fresh preview before saving." : message === "ROSTER" ? "A matched player is no longer on this team's active roster." : "Could not save the import. Please try again." }, { status: message === "STALE" ? 409 : 400 });
  }
  revalidatePath("/players");
  return NextResponse.json({ ok: true });
}
