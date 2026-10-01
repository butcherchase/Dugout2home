import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { coachApiAccess } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeName, saveGameSchema } from "@/lib/game-data";

class InputError extends Error {}
export async function POST(request: Request) {
  try {
    const access = await coachApiAccess(request);
    if ("error" in access) return NextResponse.json({ error: access.error }, { status: access.status });
    const raw = await request.text();
    if (Buffer.byteLength(raw) > 2 * 1024 * 1024) return NextResponse.json({ error: "Game data is too large." }, { status: 413 });
    let json;
    try { json = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid game data." }, { status: 400 }); }
    const parsed = saveGameSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the game details." }, { status: 400 });
    const input = parsed.data;
    const teamId = access.member.teamId;
    if (input.teamId !== teamId) return NextResponse.json({ error: "Your active team changed. Switch back to the team you analyzed before saving." }, { status: 409 });
    const result = await db.$transaction(async tx => {
      // Serialize a team's imports so concurrent clicks cannot duplicate games or new roster entries.
      await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`;
      const existing = await tx.game.findUnique({ where: { teamId_sourceHash: { teamId, sourceHash: input.sourceHash } } });
      if (existing) return { id: existing.id, duplicate: true, removed: !!existing.removedAt };
      const roster = await tx.player.findMany({ where: { teamId } });
      const selected = input.playerTargets.filter(id => id !== "new" && id !== "skip");
      if (selected.length !== new Set(selected).size) throw new InputError("Two scorebook rows cannot be assigned to the same player. Correct the rows or skip the duplicate.");
      if (selected.some(id => !roster.some(p => p.id === id && p.active))) throw new InputError("A selected roster player is not active on this team. Refresh and try again.");
      const newNames = input.analysis.playerSummaries.filter((_, i) => input.playerTargets[i] === "new").map(p => normalizeName(p.player));
      if (new Set(newNames).size !== newNames.length || newNames.some(name => roster.some(p => normalizeName(`${p.firstName} ${p.lastName ?? ""}`) === name))) {
        throw new InputError("A new player name already exists. Match it to the existing roster player instead, or ask your admin to reactivate that player.");
      }
      let seasonId: string | null = input.seasonId || null;
      if (seasonId && !await tx.season.findFirst({ where: { id: seasonId, teamId } })) throw new InputError("Season not found on this team.");
      let tournamentId: string | null = input.tournamentId || null;
      if (tournamentId) {
        const tournament = await tx.tournament.findFirst({ where: { id: tournamentId, teamId } });
        if (!tournament) throw new InputError("Tournament not found on this team.");
        if (seasonId && seasonId !== tournament.seasonId) throw new InputError("Select the tournament’s season, or move the tournament to that season first.");
        seasonId = tournament.seasonId;
      }
      if (input.newTournamentName) {
        const tournament = await tx.tournament.findFirst({ where: { teamId, seasonId, name: { equals: input.newTournamentName, mode: "insensitive" } } })
          ?? await tx.tournament.create({ data: { teamId, seasonId, name: input.newTournamentName } });
        tournamentId = tournament.id;
      }
      const analysis = { ...input.analysis, opponent: input.opponent, gameDate: input.gameDate, score: { us: input.runsFor, them: input.runsAgainst } };
      const game = await tx.game.create({ data: { teamId, seasonId, sourceHash: input.sourceHash, opponent: input.opponent, playedAt: new Date(`${input.gameDate}T00:00:00Z`), runsFor: input.runsFor, runsAgainst: input.runsAgainst, tournamentId, aiSummary: analysis as Prisma.InputJsonValue } });
      for (let i = 0; i < analysis.playerSummaries.length; i++) {
        const target = input.playerTargets[i];
        if (target === "skip") continue;
        const line = analysis.playerSummaries[i];
        let playerId = target;
        if (target === "new") {
          const [firstName, ...last] = line.player.trim().split(/\s+/);
          playerId = (await tx.player.create({ data: { teamId, firstName, lastName: last.join(" ") || null, positions: [] } })).id;
        }
        const { player: _name, details, ...stats } = line;
        await tx.playerGameLine.create({ data: { gameId: game.id, playerId, ...stats, details: details ? details as Prisma.InputJsonValue : Prisma.DbNull } });
      }
      return { id: game.id, duplicate: false };
    }, { timeout: 15000 });
    for (const path of ["/dashboard", "/players", "/recaps", "/practice"]) revalidatePath(path);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Save game failed", error);
    return NextResponse.json({ error: "The game could not be saved. Please try again; retrying will not duplicate a saved game." }, { status: 500 });
  }
}
