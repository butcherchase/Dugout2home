"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";

export async function createTournament(form: FormData) {
  const member = await requireCoach();
  const name = z.string().trim().min(1).max(120).safeParse(form.get("name"));
  if (!name.success) redirect("/recaps?message=invalid");
  const tournament = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Team" WHERE "id" = ${member.teamId} FOR UPDATE`;
    return await tx.tournament.findFirst({ where: { teamId: member.teamId, name: { equals: name.data, mode: "insensitive" } } })
      ?? await tx.tournament.create({ data: { teamId: member.teamId, name: name.data } });
  });
  revalidatePath("/recaps");
  redirect(`/recaps/tournaments/${tournament.id}`);
}

export async function assignTournament(form: FormData) {
  const member = await requireCoach();
  const gameId = String(form.get("gameId") ?? "");
  const tournamentId = String(form.get("tournamentId") ?? "");
  if (!await db.game.findFirst({ where: { id: gameId, teamId: member.teamId } })) redirect("/recaps?message=stale");
  if (tournamentId && !await db.tournament.findFirst({ where: { id: tournamentId, teamId: member.teamId } })) redirect("/recaps?message=stale");
  await db.game.updateMany({ where: { id: gameId, teamId: member.teamId }, data: { tournamentId: tournamentId || null } });
  revalidatePath("/recaps", "layout");
  revalidatePath("/practice");
  redirect(`/recaps/games/${gameId}`);
}
