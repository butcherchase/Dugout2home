import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateSchema, recordFor } from "@/lib/game-data";
import { createTournament } from "./actions";
import { GameList } from "./game-list";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";

export default async function RecapsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireCoach();
  const params = await searchParams;
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const q = get("q").trim().slice(0, 150), tournamentId = get("tournamentId"), date = get("date");
  const page = Math.max(1, Math.min(10000, Number.parseInt(get("page"), 10) || 1));
  const where: Prisma.GameWhereInput = { teamId: member.teamId,
    ...(q ? { opponent: { contains: q, mode: "insensitive" } } : {}),
    ...(tournamentId ? { tournamentId: tournamentId === "standalone" ? null : tournamentId } : {}),
    ...(dateSchema.safeParse(date).success ? { playedAt: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400000) } } : {})
  };
  const [games, count, total, tournaments] = await Promise.all([
    db.game.findMany({ where, include: { tournament: { select: { name: true } } }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }], take: 20, skip: (page - 1) * 20 }),
    db.game.count({ where }), db.game.count({ where: { teamId: member.teamId } }),
    db.tournament.findMany({ where: { teamId: member.teamId }, include: { games: { where: { teamId: member.teamId }, select: { runsFor: true, runsAgainst: true } } }, orderBy: { createdAt: "desc" } })
  ]);
  const pageLink = (n: number) => `/recaps?${new URLSearchParams({ q, tournamentId, date, page: String(n) })}`;
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Games & Tournaments</h1><p className="lede">Your saved games, player results, and the story of each tournament.</p><FormMessage code={get("message")} />
    <Link href="/analyze" className="button primary">Analyze and save a game</Link>
    <section className="panel"><h2>Game log ({total})</h2><form className="form-stack filter-form" action="/recaps" method="get"><label>Search opponent<input name="q" defaultValue={q} maxLength={150} placeholder="Opponent name" /></label><label>Tournament<select name="tournamentId" defaultValue={tournamentId}><option value="">All games</option><option value="standalone">Standalone games</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Game date<input type="date" name="date" defaultValue={dateSchema.safeParse(date).success ? date : ""} /></label><button className="button secondary">Search</button><Link href="/recaps">Clear</Link></form>
      {games.length ? <GameList games={games} /> : <div className="empty-state"><h3>{total ? "No games match these filters" : "Save your first game"}</h3><p>{total ? "Try another opponent, date, or tournament." : "Upload a scorebook, review the analysis, and click Save game. It will appear here."}</p></div>}
      {count > 20 && <nav className="pagination" aria-label="Game pages">{page > 1 && <Link href={pageLink(page - 1)}>← Previous</Link>}<span>Page {page} · {count} matches</span>{page * 20 < count && <Link href={pageLink(page + 1)}>Next →</Link>}</nav>}
    </section>
    <section className="panel"><h2>Tournaments</h2><form action={createTournament} className="form-stack inline-select"><label>New tournament name<input name="name" maxLength={120} required placeholder="Fall Frenzy — September 2026" /></label><Submit>Create tournament</Submit></form><p>Save new games into a tournament, or assign an existing game from its saved-game page.</p>
      <div className="tournament-cards">{tournaments.map(t => <Link className="module" href={`/recaps/tournaments/${t.id}`} key={t.id}><h3>{t.name}</h3><p>{t.games.length} games · {recordFor(t.games)} W–L–T</p><b>Open tournament →</b></Link>)}</div>
    </section>
  </div>;
}
