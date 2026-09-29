import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareEvaluation } from "@/app/actions";
import { Submit } from "@/app/components/submit";

export default async function PlayersPage() {
  const member = await requireCoach();
  const players = await db.player.findMany({ where: { teamId: member.teamId, active: true }, include: { evaluations: { orderBy: { createdAt: "desc" } } }, orderBy: { firstName: "asc" } });
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Player Development</h1><p className="lede">Team roster and coach evaluations. Feedback stays private until a coach shares it.</p>
    {member.role === "TEAM_ADMIN" && <Link href="/team">Manage roster and family connections</Link>}
    {!players.length && <section className="panel"><p>No roster players yet. Your team admin can add them in Team settings.</p></section>}
    {players.map(player => <section className="panel" key={player.id}><h2>{player.firstName} {player.lastName}</h2><p>{player.jersey && `#${player.jersey}`}</p>
      {!player.evaluations.length && <p>No saved evaluations yet.</p>}
      {player.evaluations.map(e => <article className="membership" key={e.id}><h3>{e.area.replaceAll("_", " ")}</h3><p>{e.note}</p><p>{e.evidence}</p>{e.score !== null && <p>Score: {e.score}</p>}
        <p>{e.sharedWithFamily ? "Shared with linked family accounts" : "Private to coaches"}</p><form action={shareEvaluation}><input type="hidden" name="evaluationId" value={e.id} /><input type="hidden" name="shared" value={String(!e.sharedWithFamily)} /><Submit>{e.sharedWithFamily ? "Make private" : "Share note and score with family"}</Submit></form>
      </article>)}
    </section>)}
  </div>;
}
