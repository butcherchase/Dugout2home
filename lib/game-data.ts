import { playerDetailsSchema } from "./player-details";
import { z } from "zod";

const count = z.number().int().min(0).max(1000);
const note = z.string().max(6000);
export const areaSchema = z.enum(["hitting", "baserunning", "defense", "throwing", "pitching", "situational_awareness"]);
export const prioritySchema = z.object({ area: areaSchema, level: z.enum(["high", "medium", "low"]), evidence: note, recommendation: note });
export const analysisSchema = z.object({
  opponent: z.string().max(150), gameDate: z.string().max(100),
  score: z.object({ us: count, them: count }), confidence: z.number().min(0).max(1), summary: note,
  excelledAt: z.array(note).max(100), workOn: z.array(note).max(100),
  events: z.array(z.object({ inning: z.number().int().min(0).max(100), half: z.enum(["top", "bottom", "unknown"]), player: z.string().max(150), event: note, result: note, confidence: z.number().min(0).max(1) })).max(2000),
  playerSummaries: z.array(z.object({ player: z.string().trim().min(1).max(120), plateAppearances: count, hits: count, walks: count, strikeouts: count, runs: count, rbi: count, notes: z.array(note).max(100), details: playerDetailsSchema.optional() })).max(100),
  priorities: z.array(prioritySchema).max(100)
});

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Choose a valid game date.");

export const saveGameSchema = z.object({
  teamId: z.string().min(1).max(100), sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  opponent: z.string().trim().min(1).max(150), gameDate: dateSchema, runsFor: count, runsAgainst: count,
  seasonId: z.string().max(100).default(""),
  tournamentId: z.string().max(100).default(""), newTournamentName: z.string().trim().max(120).default(""),
  analysis: analysisSchema, playerTargets: z.array(z.string().min(1).max(100)).max(100)
}).refine(v => v.playerTargets.length === v.analysis.playerSummaries.length, "Choose a roster match or skip for each player.")
  .refine(v => !(v.tournamentId && v.newTournamentName), "Choose an existing tournament or create one, not both.");

export function readAnalysis(value: unknown) {
  const parsed = analysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
export const gameDateLabel = (date: Date) => date.toISOString().slice(0, 10);
export function recordFor(games: { runsFor: number | null; runsAgainst: number | null }[]) {
  let wins = 0, losses = 0, ties = 0;
  for (const g of games) {
    if (g.runsFor === null || g.runsAgainst === null) continue;
    if (g.runsFor > g.runsAgainst) wins++; else if (g.runsFor < g.runsAgainst) losses++; else ties++;
  }
  return `${wins}–${losses}–${ties}`;
}
export const statKeys = ["plateAppearances", "hits", "walks", "strikeouts", "runs", "rbi"] as const;
export const statLabels = ["PA", "H", "BB", "K", "R", "RBI"];
export function totalStats(lines: Array<Record<(typeof statKeys)[number], number>>) {
  return Object.fromEntries(statKeys.map(key => [key, lines.reduce((sum, line) => sum + line[key], 0)])) as Record<(typeof statKeys)[number], number>;
}
export function combinedPriorities(games: { aiSummary: unknown }[]) {
  const groups = new Map<string, { area: z.infer<typeof areaSchema>; level: "high" | "medium" | "low"; evidence: string[]; recommendations: string[]; games: number }>();
  const rank = { low: 0, medium: 1, high: 2 };
  for (const game of games) {
    const seen = new Set<string>();
    for (const priority of readAnalysis(game.aiSummary)?.priorities ?? []) {
      const group = groups.get(priority.area) ?? { area: priority.area, level: priority.level, evidence: [], recommendations: [], games: 0 };
      if (!seen.has(priority.area)) group.games++;
      seen.add(priority.area);
      if (rank[priority.level] > rank[group.level]) group.level = priority.level;
      if (!group.evidence.includes(priority.evidence)) group.evidence.push(priority.evidence);
      if (!group.recommendations.includes(priority.recommendation)) group.recommendations.push(priority.recommendation);
      groups.set(priority.area, group);
    }
  }
  return [...groups.values()].sort((a, b) => b.games - a.games || rank[b.level] - rank[a.level]);
}
