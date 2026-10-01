import RefreshDevelopment from "./refresh-development";
import SeasonStatistics from "./season-statistics";
import { readDetails, pitchingLabels, fieldingLabels } from "@/lib/player-details";
import TeamBreakdown from "./team-breakdown";
import { gameDateLabel, statKeys, statLabels, totalStats } from "@/lib/game-data";
import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareEvaluation } from "@/app/actions";
import { Submit } from "@/app/components/submit";

export default async function PlayersPage({ searchParams }: { searchParams?: Promise<{ seasonId?: string }> } = {}) {
  const member = await requireCoach();
  const { seasonId } = await (searchParams ?? Promise.resolve({} as { seasonId?: string }));
  const seasons = await db.season.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } });
  const players = await db.player.findMany({ where: { teamId: member.teamId, active: true }, include: { gameLines: { where: { game: { teamId: member.teamId, removedAt: null, ...(seasonId ? { seasonId: seasonId === "unassigned" ? null : seasonId } : {}) } }, include: { game: { select: { id: true, opponent: true, playedAt: true } } }, orderBy: { game: { playedAt: "desc" } } }, evaluations: { where: { OR: [{ gameId: null }, { game: { removedAt: null } }] }, orderBy: { createdAt: "desc" } } }, orderBy: { firstName: "asc" } });
  const savedGames = [...new Map(players.flatMap(p => p.gameLines.map(l => [l.game.id, { id: l.game.id, label: `${gameDateLabel(l.game.playedAt)} vs. ${l.game.opponent}` }] as const))).values()].sort((a, b) => b.label.localeCompare(a.label));
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Player Development</h1><p className="lede">Saved game results and coach evaluations. Player totals include only the scorebook rows you matched when saving. Feedback stays private until a coach shares it.</p>
    <form action="/players" className="panel form-stack filter-form"><label>Season<select name="seasonId" defaultValue={seasonId ?? ""}><option value="">All seasons</option><option value="unassigned">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="button secondary">Show player results</button></form>
    <Link className="button secondary" href="/players/import">Import GameChanger season CSV</Link>
    <SeasonStatistics seasons={seasons.filter(s => !seasonId || s.id === seasonId)} />
    <h2>Saved-game development</h2>
    <TeamBreakdown players={players} />
    {savedGames.length > 0 && <RefreshDevelopment key={member.teamId + (seasonId ?? "all")} teamId={member.teamId} games={savedGames} />}
    <Link className="button secondary" href="/analyze">Build or add to roster from a scorebook</Link>
    {member.role === "TEAM_ADMIN" && <Link href="/team">Manage roster and family connections</Link>}
    {!players.length && <section className="panel"><p>No roster players yet. Upload a scorebook to create your initial roster, or ask your team admin to add players manually.</p></section>}
    {players.map(player => <section className="panel" id={`player-${player.id}`} key={player.id}><h2>{player.firstName} {player.lastName}</h2><p>{player.jersey && `#${player.jersey}`}</p>
      <div className="summary-stats"><div><strong>{player.gameLines.length}</strong><small>Games with matched results</small></div>{statKeys.map((key, i) => <div key={key}><strong>{totalStats(player.gameLines)[key]}</strong><small>{statLabels[i]}</small></div>)}</div>
      {!player.gameLines.length ? <p>No saved game results yet. Match this player when saving a scorebook.</p> : <details><summary>Game-by-game results and notes</summary><div className="table-wrap"><table className="history-table"><thead><tr><th>Game</th>{statLabels.map(s => <th key={s}>{s}</th>)}<th>Game evidence</th></tr></thead><tbody>{player.gameLines.map(line => <tr key={line.id}><td><Link href={`/recaps/games/${line.game.id}`}>{gameDateLabel(line.game.playedAt)} vs. {line.game.opponent}</Link></td>{statKeys.map(k => <td key={k}>{line[k]}</td>)}<td>{Array.isArray(line.notes) ? line.notes.filter(n => typeof n === "string").join(" · ") : ""}{(() => { const d = readDetails(line.details); return d ? <details><summary>Pitching, fielding & development</summary>{(["pitching", "fielding"] as const).map(area => <div key={area}><h4>{area}</h4>{Object.entries(area === "pitching" ? pitchingLabels : fieldingLabels).map(([key, label]) => <p key={key}>{label}: {(d[area] as Record<string, number | null>)[key] ?? "Not recorded"}</p>)}</div>)}{(["hittingFeedback", "pitchingFeedback", "fieldingFeedback"] as const).map(area => <div key={area}><h4>{area.replace("Feedback", " development")}</h4><p>Strengths: {d[area].strengths.join(" · ") || "No recorded observation"}</p><p>Focus: {d[area].focus.join(" · ") || "No recorded observation"}</p></div>)}</details> : null; })()}</td></tr>)}</tbody></table></div></details>}
      <Link className="button secondary" href={`/players/${player.id}/feedback${seasonId ? `?seasonId=${encodeURIComponent(seasonId)}` : ""}`}>Draft parent development email</Link>
      <h3>Coach evaluations (all seasons)</h3>
      {!player.evaluations.length && <p>No saved evaluations yet.</p>}
      {player.evaluations.map(e => <article className="membership" key={e.id}><h3>{e.area.replaceAll("_", " ")}</h3><p>{e.note}</p><p>{e.evidence}</p>{e.score !== null && <p>Score: {e.score}</p>}
        <p>{e.sharedWithFamily ? "Shared with linked family accounts" : "Private to coaches"}</p><form action={shareEvaluation}><input type="hidden" name="evaluationId" value={e.id} /><input type="hidden" name="shared" value={String(!e.sharedWithFamily)} /><Submit>{e.sharedWithFamily ? "Make private" : "Share note and score with family"}</Submit></form>
      </article>)}
    </section>)}
  </div>;
}
