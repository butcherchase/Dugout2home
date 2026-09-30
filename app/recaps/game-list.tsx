import Link from "next/link";
import { gameDateLabel } from "@/lib/game-data";
export function GameList({ games }: { games: { id: string; opponent: string; playedAt: Date; runsFor: number | null; runsAgainst: number | null; tournament?: { name: string } | null }[] }) {
  return <ul className="game-list">{games.map(game => <li key={game.id}><div><Link href={`/recaps/games/${game.id}`}>vs. {game.opponent}</Link><span className="game-meta">{gameDateLabel(game.playedAt)} · {game.tournament?.name ?? "Standalone game"}</span></div><span className="game-score" aria-label={`Our runs ${game.runsFor ?? "unknown"}, opponent runs ${game.runsAgainst ?? "unknown"}`}>{game.runsFor ?? "—"}–{game.runsAgainst ?? "—"}</span></li>)}</ul>;
}
