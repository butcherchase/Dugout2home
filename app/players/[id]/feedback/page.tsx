import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { playerEmailDraft } from "@/lib/player-email";
import EmailDraft from "./email-draft";
export default async function FeedbackPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ seasonId?: string }> }) {
  const member = await requireCoach(), { id } = await params, { seasonId } = await searchParams;
  const player = await db.player.findFirst({ where: { id, teamId: member.teamId }, include: {
    gameLines: { where: { game: { teamId: member.teamId, removedAt: null, ...(seasonId ? { seasonId: seasonId === "unassigned" ? null : seasonId } : {}) } }, include: { game: { select: { opponent: true, playedAt: true } } }, orderBy: { game: { playedAt: "desc" } }, take: 5 },
    accessLinks: { where: { member: { teamId: member.teamId, role: "PARENT", status: "APPROVED" } }, include: { member: { include: { user: { select: { name: true, email: true } } } } } }
  } });
  if (!player) notFound();
  const name = `${player.firstName} ${player.lastName ?? ""}`.trim();
  return <div className="shell page"><Link href="/players">← Player development</Link><h1>{name}</h1><p className="lede">Private development feedback for this player’s parent. Draft uses the most recent five matched games{seasonId ? " in the selected season" : ""}.</p><EmailDraft key={id + (seasonId ?? "")} playerName={name} teamName={member.team.name} parents={player.accessLinks.map(l => l.member.user)} initialBody={playerEmailDraft(member.team.name, name, player.gameLines)} /></div>;
}
