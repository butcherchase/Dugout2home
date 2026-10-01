import GameStatus from "@/app/recaps/game-status";
import ShareRecap from "@/app/recaps/share-recap";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { gameDateLabel, readAnalysis, statKeys, statLabels } from "@/lib/game-data";
import { assignTournament, assignSeason } from "@/app/recaps/actions";
import { Submit } from "@/app/components/submit";

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireCoach();
  const { id } = await params;
  const game = await db.game.findFirst({ where: { id, teamId: member.teamId }, include: { tournament: true, playerLines: { where: { player: { teamId: member.teamId } }, include: { player: true } } } });
  if (!game) notFound();
  if (game.removedAt) return <div className="shell page"><Link href="/recaps/removed">← Removed games</Link><h1>Removed: vs. {game.opponent}</h1><section className="panel"><p>This game is excluded from player totals, tournament records and practice evidence.</p><GameStatus teamId={member.teamId} gameId={game.id} opponent={game.opponent} version={game.updatedAt.toISOString()} removed /></section></div>;
  const tournaments = await db.tournament.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } });
  const seasons = await db.season.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } });
  const analysis = readAnalysis(game.aiSummary);
  return <div className="shell page game-details"><Link href="/recaps" className="breadcrumb">← All games and tournaments</Link><span className="eyebrow">{member.team.name} · SAVED GAME</span><h1>vs. {game.opponent}</h1><p className="lede">{gameDateLabel(game.playedAt)} · {game.runsFor ?? "—"}–{game.runsAgainst ?? "—"}</p>
    {game.tournament && <p>Tournament: <Link href={`/recaps/tournaments/${game.tournament.id}`}>{game.tournament.name}</Link></p>}
    <ShareRecap teamName={member.team.name} logoData={member.team.logoData} title={`vs. ${game.opponent}`} score={`${game.runsFor ?? "—"}–${game.runsAgainst ?? "—"}`} initialCaption={`${member.team.name} vs. ${game.opponent} | ${gameDateLabel(game.playedAt)}\nFinal score: ${game.runsFor ?? "—"}–${game.runsAgainst ?? "—"}.\nGrowing together, one game at a time. #Dugout2Home`} />
    <section className="panel"><GameStatus teamId={member.teamId} gameId={game.id} opponent={game.opponent} version={game.updatedAt.toISOString()} /></section>
    <div className="actions"><Link className="button primary" href={`/practice?gameId=${game.id}`}>Build practice from this game</Link><Link className="button secondary" href="/players">View player totals</Link></div>
    <form action={assignTournament} className="panel form-stack inline-select"><input type="hidden" name="teamId" value={member.teamId} /><input type="hidden" name="gameId" value={game.id} /><label>Assign tournament<select name="tournamentId" defaultValue={game.tournamentId ?? ""}><option value="">Standalone game</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><Submit>Update tournament</Submit></form>
    {!game.tournamentId && <form action={assignSeason} className="panel form-stack"><input type="hidden" name="teamId" value={member.teamId} /><input type="hidden" name="gameId" value={game.id} /><label>Season<select name="seasonId" defaultValue={game.seasonId ?? ""}><option value="">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><Submit>Update season</Submit></form>}
    <section className="panel"><h2>Game recap</h2><p className="game-notes">{analysis?.summary ?? "No analysis was stored for this game."}</p>{analysis && <small>AI confidence: {Math.round(analysis.confidence * 100)}%. Confirm uncertain observations against the scorebook.</small>}</section>
    {analysis && <><div className="two-col"><section className="panel"><h2>Excelled at</h2><ul>{analysis.excelledAt.map((s, i) => <li key={i}>{s}</li>)}</ul></section><section className="panel"><h2>Work on</h2><ul>{analysis.workOn.map((s, i) => <li key={i}>{s}</li>)}</ul></section></div>
      <section className="panel"><h2>Practice priorities</h2>{!analysis.priorities.length && <p>No practice priorities were extracted.</p>}{analysis.priorities.map((p, i) => <article className="membership" key={i}><span className={`pill ${p.level}`}>{p.level}</span><h3>{p.area.replaceAll("_", " ")}</h3><p>{p.recommendation}</p><small>{p.evidence}</small></article>)}</section></>}
    <section className="panel"><h2>Results included in player totals</h2>{!game.playerLines.length ? <p>No roster players were matched when this game was saved. The game and team recap are still saved.</p> : <div className="table-wrap"><table><thead><tr><th>Roster player</th>{statLabels.map(s => <th key={s}>{s}</th>)}<th>Game notes</th></tr></thead><tbody>{game.playerLines.map(line => <tr key={line.id}><td><Link href={`/players#player-${line.player.id}`}>{line.player.firstName} {line.player.lastName}</Link></td>{statKeys.map(k => <td key={k}>{line[k]}</td>)}<td>{Array.isArray(line.notes) ? line.notes.filter(n => typeof n === "string").join(" · ") : ""}</td></tr>)}</tbody></table></div>}</section>
    {analysis && <section className="panel"><details><summary>All reviewed scorebook rows (including skipped players)</summary><div className="table-wrap"><table><thead><tr><th>Scorebook name</th>{statLabels.map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{analysis.playerSummaries.map((p, i) => <tr key={i}><td>{p.player}</td>{statKeys.map(k => <td key={k}>{p[k]}</td>)}</tr>)}</tbody></table></div></details><details><summary>Game events ({analysis.events.length})</summary><div className="table-wrap"><table><thead><tr><th>Inning</th><th>Player</th><th>Event</th><th>Result</th></tr></thead><tbody>{analysis.events.map((e, i) => <tr key={i}><td>{e.inning} {e.half}</td><td>{e.player}</td><td>{e.event}</td><td>{e.result}</td></tr>)}</tbody></table></div></details></section>}
  </div>;
}
