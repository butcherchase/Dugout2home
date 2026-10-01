import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import ImportCsv from "./upload";
export default async function ImportPage() {
  const member = await requireCoach();
  const [seasons, players] = await Promise.all([
    db.season.findMany({ where: { teamId: member.teamId }, select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    db.player.findMany({ where: { teamId: member.teamId, active: true }, select: { id: true, firstName: true, lastName: true, jersey: true }, orderBy: { firstName: "asc" } })
  ]);
  return <div className="shell page"><h1>Import season statistics</h1><p className="lede">Upload one GameChanger CSV containing batting, pitching and fielding. These totals stay separate from saved games.</p><Link href="/players">Back to Player Development</Link>{!seasons.length || !players.length ? <section className="panel"><p>Create a season in Games & Tournaments and add your roster before importing.</p><Link href="/recaps">Manage seasons</Link> · <Link href="/analyze">Build roster from a scorebook</Link></section> : <ImportCsv seasons={seasons} roster={players} />}</div>;
}
