import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateSchema } from "@/lib/game-data";
import { createTournament, createSeason } from "./actions";
import SeasonFolders from "./season-folders";
import { Submit } from "@/app/components/submit";
import { FormMessage } from "@/app/components/form-message";
export default async function RecapsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireCoach(), params = await searchParams;
  const get = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const q = get("q").trim().slice(0, 150), tournamentId = get("tournamentId"), date = get("date"), seasonId = get("seasonId");
  const filtered = !!(q || tournamentId || date || seasonId);
  const where: Prisma.GameWhereInput = { teamId: member.teamId, removedAt: null,
    ...(q ? { opponent: { contains: q, mode: "insensitive" } } : {}),
    ...(seasonId ? { seasonId: seasonId === "unassigned" ? null : seasonId } : {}),
    ...(tournamentId ? { tournamentId: tournamentId === "standalone" ? null : tournamentId } : {}),
    ...(dateSchema.safeParse(date).success ? { playedAt: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(new Date(`${date}T00:00:00Z`).getTime() + 86400000) } } : {})
  };
  const [games, total, tournaments, seasons] = await Promise.all([
    db.game.findMany({ where, select: { id: true, opponent: true, playedAt: true, runsFor: true, runsAgainst: true, seasonId: true, tournamentId: true, tournament: { select: { name: true } } }, orderBy: [{ playedAt: "desc" }, { createdAt: "desc" }] }),
    db.game.count({ where: { teamId: member.teamId, removedAt: null } }),
    db.tournament.findMany({ where: { teamId: member.teamId }, select: { id: true, name: true, seasonId: true }, orderBy: { createdAt: "desc" } }),
    db.season.findMany({ where: { teamId: member.teamId }, orderBy: { createdAt: "desc" } })
  ]);
  return <div className="shell page"><span className="eyebrow">{member.team.name}</span><h1>Games & Tournaments</h1><p className="lede">A season at a time. Expand a folder to see its tournaments and saved games.</p><FormMessage code={get("message")} /><div className="actions"><Link className="button primary" href="/analyze">Analyze and save a game</Link><Link className="button secondary" href="/recaps/removed">Removed games / Restore</Link></div>
    <section className="panel"><h2>Game log ({total})</h2><form action="/recaps" className="form-stack filter-form"><label>Search opponent<input name="q" defaultValue={q} maxLength={150} /></label><label>Season<select name="seasonId" defaultValue={seasonId}><option value="">All seasons</option><option value="unassigned">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Tournament<select name="tournamentId" defaultValue={tournamentId}><option value="">All games</option><option value="standalone">Standalone games</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><label>Game date<input type="date" name="date" defaultValue={dateSchema.safeParse(date).success ? date : ""} /></label><button className="button secondary">Search</button><Link href="/recaps">Clear</Link></form>
    {!games.length && <p>{total ? "No games match these filters" : "Save your first game: upload a scorebook and click Save game."}</p>}</section>
    <SeasonFolders seasons={seasons} tournaments={tournaments} games={games} filtered={filtered} />
    <details className="panel"><summary>Create a season or tournament</summary><div className="two-col"><form action={createSeason} className="form-stack"><input type="hidden" name="teamId" value={member.teamId} /><h2>New season</h2><label>Season name<input name="name" maxLength={80} placeholder="Fall 2026" required /></label><Submit>Create season</Submit></form>
    <form action={createTournament} className="form-stack"><input type="hidden" name="teamId" value={member.teamId} /><h2>New tournament</h2><label>Name<input name="name" maxLength={120} required /></label><label>Season<select name="seasonId"><option value="">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><Submit>Create tournament</Submit></form></div></details>
    <p className="muted">Existing games are kept in Unassigned season. Open a tournament to move it and all its games together, or open a standalone game to assign its season.</p>
  </div>;
}
