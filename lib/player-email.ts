import { gameDateLabel } from "./game-data";
import { playerObservations } from "./player-observations";
type Line = { hits: number; plateAppearances: number; walks: number; strikeouts: number; notes: unknown; details: unknown; game: { opponent: string; playedAt: Date } };
export function playerEmailDraft(team: string, name: string, lines: Line[]) {
  const recent = [...lines].sort((a, b) => b.game.playedAt.getTime() - a.game.playedAt.getTime()).slice(0, 5);
  const evidence = recent.map(l => `${gameDateLabel(l.game.playedAt)} vs. ${l.game.opponent}: ${l.hits} hits, ${l.walks} walks, ${l.strikeouts} strikeouts in ${l.plateAppearances} plate appearances.`);
  const observations = (["hitting", "pitching", "fielding"] as const).map(area => playerObservations(recent, area));
  const strengths = [...new Set(observations.flatMap(o => o.strengths))].slice(0, 6);
  const focus = [...new Set(observations.flatMap(o => o.focus))].slice(0, 6);
  const notes = recent.flatMap(l => Array.isArray(l.notes) ? l.notes.filter((n): n is string => typeof n === "string") : []).slice(0, 3);
  return `Hi,

Here is ${name}'s development update from ${team}, based on ${recent.length} saved ${recent.length === 1 ? "game" : "games"}.

Game evidence
${evidence.join("\n") || "No saved game evidence yet."}

Strengths and progress
${strengths.join("\n") || "[Coach: add strengths you observed. The scorebook did not provide a specific strengths observation.]"}

Areas to work on
${focus.join("\n") || "[Coach: add an evidence-based development focus.]"}${notes.length ? `

Scorebook observations to review
${notes.join("\n")}` : ""}

Next steps at home
[Coach: add a short drill or practice assignment.]

Coach's progress note
[Coach: describe any improvement you have observed over time.]

Thank you,
${team} coaching staff`;
}
