import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import AnalyzeClient from "./analyze-client";
export default async function AnalyzePage() {
  const member = await requireCoach();
  const [roster, tournaments, seasons] = await Promise.all([
    db.player.findMany({ where: { teamId: member.teamId, active: true }, select: { id: true, firstName: true, lastName: true, jersey: true }, orderBy: { firstName: "asc" } }),
    db.tournament.findMany({ where: { teamId: member.teamId }, select: { id: true, name: true, seasonId: true }, orderBy: { createdAt: "desc" } }),
    db.season.findMany({ where: { teamId: member.teamId }, select: { id: true, name: true }, orderBy: { createdAt: "desc" } })
  ]);
  return <AnalyzeClient teamName={member.team.name} teamId={member.teamId} roster={roster} tournaments={tournaments} seasons={seasons} />;
}
