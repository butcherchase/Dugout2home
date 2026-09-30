import { combinedPriorities } from "./game-data";
export type TrendGame = { aiSummary: unknown; runsFor: number | null; runsAgainst: number | null };
export const isLoss = (g: TrendGame) => g.runsFor !== null && g.runsAgainst !== null && g.runsFor < g.runsAgainst;
export function lossPatterns(games: TrendGame[]) {
  const losses = games.filter(isLoss);
  const other = games.filter(g => g.runsFor !== null && g.runsAgainst !== null && !isLoss(g));
  const comparison = combinedPriorities(other);
  return combinedPriorities(losses).map(p => ({ ...p, losses: losses.length, otherGames: other.length, otherCount: comparison.find(c => c.area === p.area)?.games ?? 0 }));
}
