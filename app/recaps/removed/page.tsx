import Link from "next/link";
import { requireCoach } from "@/lib/auth";
import { db } from "@/lib/db";
import { gameDateLabel } from "@/lib/game-data";
import GameStatus from "../game-status";

export default async function RemovedGamesPage() {
  const member = await requireCoach();
  const games = await db.game.findMany({ where: { teamId: member.teamId, removedAt: { not: null } }, orderBy: { removedAt: "desc" }, select: { id: true, opponent: true, playedAt: true, removedAt: true, updatedAt: true } });
  return <div className="shell page"><Link href="/recaps">← Active games and tournaments</Link><h1>Removed games</h1><p className="lede">These games do not count toward player totals, tournament records or practice evidence. Restore one to include it again.</p>
    {!games.length && <section className="panel"><p>No games have been removed.</p></section>}
    {games.map(game => <section className="panel" key={game.id}><h2>vs. {game.opponent}</h2><p>Game date: {gameDateLabel(game.playedAt)} · Removed: {game.removedAt?.toISOString().slice(0, 10)}</p><GameStatus teamId={member.teamId} gameId={game.id} opponent={game.opponent} version={game.updatedAt.toISOString()} removed /></section>)}
  </div>;
}
