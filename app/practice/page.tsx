import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { combinedPriorities, gameDateLabel } from "@/lib/game-data";
import { PriorityList } from "@/app/recaps/priority-list";
import GeneratePlan from "./generate-plan";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ gameId?: string; tournamentId?: string }> }) {
  const member = await requireCoach();
  const params = await searchParams;
  const [recent, tournaments] = await Promise.all([
    db.game.findMany({ where: { teamId: member.teamId }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }], take: 100, select: { id: true, opponent: true, playedAt: true } }),
    db.tournament.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true } })
  ]);
  let title = "", sourceKey = "empty";
  let games: { aiSummary: unknown }[] = [];
  let selectedGame: (typeof recent)[number] | null = null;
  if (params.tournamentId) {
    const tournament = await db.tournament.findFirst({ where: { id: params.tournamentId, teamId: member.teamId }, include: { games: { where: { teamId: member.teamId }, select: { aiSummary: true } } } });
    if (!tournament) notFound();
    games = tournament.games; title = tournament.name; sourceKey = tournament.id;
  } else {
    const gameId = params.gameId || recent[0]?.id;
    if (gameId) {
      const game = await db.game.findFirst({ where: { id: gameId, teamId: member.teamId } });
      if (!game) notFound();
      games = [game]; title = `${gameDateLabel(game.playedAt)} vs. ${game.opponent}`; sourceKey = game.id; selectedGame = game;
    }
  }
  const priorities = combinedPriorities(games);
  const gameOptions = selectedGame && !recent.some(g => g.id === selectedGame.id) ? [selectedGame, ...recent] : recent;
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Practice Planner</h1><p className="lede">Turn saved game and tournament evidence into your next practice.</p>
    {!recent.length && !params.tournamentId ? <section className="panel empty-state"><h2>Start with a saved game</h2><p>Analyze a scorebook, review the results, and click Save game. Its practice priorities will appear here.</p><Link className="button primary" href="/analyze">Analyze a scorebook</Link></section> : <>
      <div className="two-col"><form action="/practice" className="panel form-stack"><label>Use one game<select name="gameId" defaultValue={selectedGame?.id ?? recent[0]?.id}>{gameOptions.map(g => <option key={g.id} value={g.id}>{gameDateLabel(g.playedAt)} vs. {g.opponent}</option>)}</select></label><button className="button secondary" disabled={!recent.length}>Load game priorities</button></form>
        <form action="/practice" className="panel form-stack"><label>Use a whole tournament<select name="tournamentId" defaultValue={params.tournamentId ?? ""} required><option value="">Choose tournament…</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><button className="button secondary" disabled={!tournaments.length}>Load tournament priorities</button></form></div>
      <section className="panel"><span className="eyebrow">SAVED GAME EVIDENCE</span><h2>{title}</h2><p>{games.length} saved {games.length === 1 ? "game" : "games"} · {member.team.ageGroup || "Youth softball"}</p>{priorities.length ? <PriorityList priorities={priorities} /> : <p>No practice priorities were saved for this selection.</p>}</section>
      <GeneratePlan key={sourceKey} teamId={member.teamId} priorities={priorities.map(p => ({ area: p.area, level: p.level, evidence: p.evidence.join(" ").slice(0, 6000), recommendation: p.recommendations.join(" ").slice(0, 6000) }))} />
    </>}
  </div>;
}
