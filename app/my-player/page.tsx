import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCoach } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function MyPlayerPage() {
  const member = await requireMember();
  if (isCoach(member.role)) redirect("/players");
  // Fetch only linked players and explicitly shared feedback, never internal evidence.
  const players = await db.player.findMany({
    where: { teamId: member.teamId, active: true, accessLinks: { some: { memberId: member.id } } },
    select: { id: true, firstName: true, lastName: true, jersey: true, positions: true,
      evaluations: { where: { sharedWithFamily: true, OR: [{ gameId: null }, { game: { removedAt: null } }] }, select: { id: true, area: true, score: true, note: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
    orderBy: { firstName: "asc" }
  });
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>{member.role === "PLAYER" ? "My development" : "My players"}</h1>
    <p className="lede">Your player profiles and feedback shared by your coaches.</p>
    {!players.length && <section className="panel"><h2>Your player connection is not ready</h2><p>Ask your team admin to confirm your roster link. No other players’ information is visible here.</p></section>}
    {players.map(player => <section className="panel" key={player.id}><h2>{player.firstName} {player.lastName}</h2><p>{player.jersey && `#${player.jersey} · `}{player.positions.join(", ")}</p>
      <h3>Coach-shared development feedback</h3>{!player.evaluations.length && <p>Your coach has not shared development feedback yet.</p>}
      {player.evaluations.map(e => <article className="membership" key={e.id}><strong>{e.area.replaceAll("_", " ")}</strong><p>{e.note || "No written note."}</p>{e.score !== null && <p>Coach score: {e.score}</p>}<small>{e.createdAt.toISOString().slice(0, 10)}</small></article>)}
    </section>)}
  </div>;
}
