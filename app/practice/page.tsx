import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { combinedPriorities, gameDateLabel, recordFor } from "@/lib/game-data";
import { isLoss, lossPatterns } from "@/lib/game-trends";
import { PriorityList } from "@/app/recaps/priority-list";
import GeneratePlan from "./generate-plan";

export default async function PracticePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireCoach(), params = await searchParams;
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const seasonId = get("seasonId"), tournamentId = get("tournamentId"), lossesOnly = get("lossesOnly") === "1";
  const [options, tournaments, seasons] = await Promise.all([
    db.game.findMany({ where: { teamId: member.teamId, removedAt: null, ...(seasonId ? { seasonId: seasonId === "unassigned" ? null : seasonId } : {}) }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }], select: { id: true, opponent: true, playedAt: true, runsFor: true, runsAgainst: true } }),
    db.tournament.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } }),
    db.season.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } })
  ]);
  const raw = params.gameId;
  const selectedIds = [...new Set(Array.isArray(raw) ? raw : raw ? [raw] : [])];
  if (selectedIds.length > 100) return <div className="shell page"><h1>Choose up to 100 games</h1><Link href="/practice">Return to game selection</Link></div>;
  let title = "Selected games";
  if (tournamentId) {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) notFound();
    title = tournament.name;
  }
  const ids = selectedIds.length ? selectedIds : !tournamentId && !get("selection") && options[0] ? [options[0].id] : [];
  const games = await db.game.findMany({ where: { teamId: member.teamId, removedAt: null, ...(tournamentId ? { tournamentId } : { id: { in: ids } }) }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }] });
  if (!tournamentId && games.length !== ids.length) notFound();
  const source = lossesOnly ? games.filter(isLoss) : games;
  const priorities = combinedPriorities(source), patterns = lossPatterns(games);
  const checked = new Set(games.map(g => g.id));
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Practice Planner</h1><p className="lede">Compare saved games, spot recurring needs, and plan the next practice.</p>
    <form action="/practice" className="panel form-stack filter-form"><label>Show games from season<select name="seasonId" defaultValue={seasonId}><option value="">All seasons</option><option value="unassigned">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="button secondary">Load season games</button></form>
    {!options.length && <section className="panel"><h2>No saved games in this selection</h2><Link href="/analyze">Analyze and save a scorebook</Link></section>}
    <div className="two-col"><form action="/practice" className="panel form-stack"><h2>Choose multiple games</h2><input type="hidden" name="selection" value="1" /><input type="hidden" name="seasonId" value={seasonId} /><fieldset className="game-picker"><legend>Up to 100 games</legend>{options.map(g => <label className="check" key={g.id}><input type="checkbox" name="gameId" value={g.id} defaultChecked={checked.has(g.id)} />{gameDateLabel(g.playedAt)} vs. {g.opponent} · {g.runsFor ?? "—"}–{g.runsAgainst ?? "—"}</label>)}</fieldset><label className="check"><input type="checkbox" name="lossesOnly" value="1" defaultChecked={lossesOnly} />Build practice from losses only</label><button className="button secondary">Analyze selected games</button></form>
    <form action="/practice" className="panel form-stack"><h2>Or use a whole tournament</h2><label>Tournament<select name="tournamentId" defaultValue={tournamentId} required><option value="">Choose tournament…</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label className="check"><input type="checkbox" name="lossesOnly" value="1" defaultChecked={lossesOnly} />Build practice from losses only</label><button className="button secondary" disabled={!tournaments.length}>Analyze tournament</button></form></div>
    <section className="panel"><h2>{title}</h2><p>{games.length} selected games · {recordFor(games)} W–L–T</p><details><summary>Games included in this comparison</summary><ul>{games.map(g => <li key={g.id}>{gameDateLabel(g.playedAt)} vs. {g.opponent} · {g.runsFor ?? "—"}–{g.runsAgainst ?? "—"}</li>)}</ul></details><h3>Patterns in losses</h3>
      {patterns.length ? <><p>Issues flagged in losses compared with scored wins and ties in this selection. These observations suggest practice needs; they do not establish why a game was lost.</p><div className="table-wrap"><table><thead><tr><th>Area</th><th>Losses flagging this</th><th>Wins/ties flagging this</th><th>Interpretation</th></tr></thead><tbody>{patterns.map(p => <tr key={p.area}><td>{p.area.replaceAll("_", " ")}</td><td>{p.games}/{p.losses}</td><td>{p.otherGames ? `${p.otherCount}/${p.otherGames}` : "No comparison games"}</td><td>{p.games >= 2 ? "Recurring in losses" : "One game observation"}</td></tr>)}</tbody></table></div></> : <p>No saved development priorities were found in losses for this selection.</p>}
    </section>
    <section className="panel"><h2>Practice priorities {lossesOnly ? "from losses" : "from selected games"}</h2><p>{source.length} games contributing · {member.team.ageGroup || "Youth softball"}</p>{priorities.length ? <PriorityList priorities={priorities} /> : <p>Select games with saved practice priorities.</p>}</section>
    <GeneratePlan key={source.map(g => g.id).join(",")} teamId={member.teamId} priorities={priorities.map(p => ({ area: p.area, level: p.level, evidence: `Flagged in ${p.games} of ${source.length} selected ${lossesOnly ? "losses" : "games"}. ${p.evidence.join(" ")}`.slice(0, 6000), recommendation: p.recommendations.join(" ").slice(0, 6000) }))} />
  </div>;
}
