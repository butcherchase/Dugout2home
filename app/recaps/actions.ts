"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";

async function access(form: FormData) {
  const member = await requireCoach();
  if (form.has("teamId") && form.get("teamId") !== member.teamId) redirect("/recaps?message=stale");
  return member;
}
export async function createSeason(form: FormData) {
  const member = await access(form);
  const name = z.string().trim().min(1).max(80).safeParse(form.get("name"));
  if (!name.success) redirect("/recaps?message=invalid");
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${member.teamId} FOR UPDATE`;
    if (!await tx.season.findFirst({ where: { teamId: member.teamId, name: { equals: name.data, mode: "insensitive" } } }))
      await tx.season.create({ data: { teamId: member.teamId, name: name.data } });
  });
  revalidatePath("/recaps"); revalidatePath("/analyze");
  redirect("/recaps?message=saved");
}
export async function createTournament(form: FormData) {
  const member = await access(form);
  const name = z.string().trim().min(1).max(120).safeParse(form.get("name"));
  const seasonId = String(form.get("seasonId") ?? "") || null;
  if (!name.success) redirect("/recaps?message=invalid");
  if (seasonId && !await db.season.findFirst({ where: { id: seasonId, teamId: member.teamId } })) redirect("/recaps?message=stale");
  const tournament = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${member.teamId} FOR UPDATE`;
    return await tx.tournament.findFirst({ where: { teamId: member.teamId, seasonId, name: { equals: name.data, mode: "insensitive" } } })
      ?? await tx.tournament.create({ data: { teamId: member.teamId, seasonId, name: name.data } });
  });
  revalidatePath("/recaps"); revalidatePath("/analyze");
  redirect(`/recaps/tournaments/${tournament.id}`);
}
export async function assignTournament(form: FormData) {
  const member = await access(form);
  const gameId = String(form.get("gameId") ?? "");
  const tournamentId = String(form.get("tournamentId") ?? "") || null;
  const ok = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${member.teamId} FOR UPDATE`;
    const game = await tx.game.findFirst({ where: { id: gameId, teamId: member.teamId, removedAt: null } });
    if (!game) return false;
    const tournament = tournamentId ? await tx.tournament.findFirst({ where: { id: tournamentId, teamId: member.teamId } }) : null;
    if (tournamentId && !tournament) return false;
    await tx.game.update({ where: { id: gameId }, data: { tournamentId, seasonId: tournament ? tournament.seasonId : game.seasonId } });
    return true;
  });
  if (!ok) redirect("/recaps?message=stale");
  revalidatePath("/recaps", "layout"); revalidatePath("/practice");
  redirect(`/recaps/games/${gameId}`);
}
// Moving a tournament moves all its games in the same transaction.
export async function assignSeason(form: FormData) {
  const member = await access(form);
  const seasonId = String(form.get("seasonId") ?? "") || null;
  const tournamentId = String(form.get("tournamentId") ?? "");
  const gameId = String(form.get("gameId") ?? "");
  const ok = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${member.teamId} FOR UPDATE`;
    if (seasonId && !await tx.season.findFirst({ where: { id: seasonId, teamId: member.teamId } })) return false;
    if (tournamentId) {
      if (!await tx.tournament.findFirst({ where: { id: tournamentId, teamId: member.teamId } })) return false;
      await tx.tournament.update({ where: { id: tournamentId }, data: { seasonId } });
      await tx.game.updateMany({ where: { teamId: member.teamId, tournamentId }, data: { seasonId } });
    } else if (gameId) {
      const changed = await tx.game.updateMany({ where: { id: gameId, teamId: member.teamId, removedAt: null, tournamentId: null }, data: { seasonId } });
      if (!changed.count) return false;
    } else return false;
    return true;
  });
  if (!ok) redirect("/recaps?message=stale");
  revalidatePath("/recaps", "layout"); revalidatePath("/practice"); revalidatePath("/players"); revalidatePath("/analyze");
  redirect("/recaps?message=saved");
}
