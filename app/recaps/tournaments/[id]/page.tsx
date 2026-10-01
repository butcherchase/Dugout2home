import ShareRecap from "@/app/recaps/share-recap";
import { assignSeason } from "@/app/recaps/actions";
import { Submit } from "@/app/components/submit";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { combinedPriorities, readAnalysis, recordFor, statKeys, statLabels, totalStats } from "@/lib/game-data";
import { GameList } from "@/app/recaps/game-list";
import { PriorityList } from "@/app/recaps/priority-list";

export default async function TournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireCoach();
  const { id } = await params;
  const tournament = await db.tournament.findFirst({ where: { id, teamId: member.teamId }, include: { games: { where: { teamId: member.teamId, removedAt: null }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }], include: { tournament: { select: { name: true } }, playerLines: { where: { player: { teamId: member.teamId } }, include: { player: true } } } } } });
  if (!tournament) notFound();
  const seasons = await db.season.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } });
  const games = tournament.games;
  const groups = new Map<string, { name: string; lines: (typeof games)[number]["playerLines"] }>();
  for (const game of games) for (const line of game.playerLines) {
    const group = groups.get(line.playerId) ?? { name: `${line.player.firstName} ${line.player.lastName ?? ""}`, lines: [] };
    group.lines.push(line); groups.set(line.playerId, group);
  }
  const strengths = [...new Set(games.flatMap(g => readAnalysis(g.aiSummary)?.excelledAt ?? []))];
  const focus = [...new Set(games.flatMap(g => readAnalysis(g.aiSummary)?.workOn ?? []))];
  const priorities = combinedPriorities(games);
  return <div className="shell page game-details"><Link href="/recaps" className="breadcrumb">← All games and tournaments</Link><span className="eyebrow">{member.team.name} · TOURNAMENT</span><h1>{tournament.name}</h1>
    <ShareRecap teamName={member.team.name} logoData={member.team.logoData} title={tournament.name} score={`${recordFor(games)} W–L–T`} initialCaption={`${member.team.name} | ${tournament.name}\n${games.length} saved games • ${recordFor(games)} W–L–T.\nProud of the effort and excited to keep improving! #Dugout2Home`} />
    <div className="summary-stats"><div><strong>{games.length}</strong><small>Saved games</small></div><div><strong>{recordFor(games)}</strong><small>Wins–losses–ties</small></div><div><strong>{games.reduce((sum, g) => sum + (g.runsFor ?? 0), 0)}</strong><small>Runs scored</small></div><div><strong>{games.reduce((sum, g) => sum + (g.runsAgainst ?? 0), 0)}</strong><small>Runs allowed</small></div></div>
    {games.length > 0 && <Link className="button primary" href={`/practice?tournamentId=${tournament.id}`}>Plan practice from this tournament</Link>}
    <form action={assignSeason} className="panel form-stack"><input type="hidden" name="teamId" value={member.teamId} /><input type="hidden" name="tournamentId" value={tournament.id} /><label>Season<select name="seasonId" defaultValue={tournament.seasonId ?? ""}><option value="">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><Submit>Move tournament and all games</Submit></form>
    <section className="panel"><details><summary>Saved games ({games.length})</summary>{games.length ? <GameList games={games} /> : <div className="empty-state"><h3>Your tournament is ready</h3><p>Choose this tournament when saving a scorebook, or open an existing saved game and assign it here.</p><Link href="/analyze">Analyze and save a game</Link><p><Link href="/recaps">Find an existing game</Link></p></div>}</details></section>
    {games.length > 0 && <><div className="two-col"><section className="panel"><h2>Strengths across saved games</h2>{strengths.length ? <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>No strengths were extracted.</p>}</section><section className="panel"><h2>Development focus</h2>{focus.length ? <ul>{focus.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>No focus areas were extracted.</p>}</section></div>
      <section className="panel"><h2>Recurring practice priorities</h2><p>Combined from the saved game analyses. Each count is the number of games that flagged the area.</p>{priorities.length ? <PriorityList priorities={priorities} /> : <p>No practice priorities were extracted.</p>}</section>
      <section className="panel"><h2>Tournament player totals</h2><p>Only roster-matched results count toward these totals.</p><div className="table-wrap"><table><thead><tr><th>Player</th><th>Games</th>{statLabels.map(s => <th key={s}>{s}</th>)}</tr></thead><tbody>{[...groups].sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([id, group]) => { const stats = totalStats(group.lines); return <tr key={id}><td><Link href={`/players#player-${id}`}>{group.name}</Link></td><td>{group.lines.length}</td>{statKeys.map(k => <td key={k}>{stats[k]}</td>)}</tr>; })}</tbody></table></div></section></>}
  </div>;
}
