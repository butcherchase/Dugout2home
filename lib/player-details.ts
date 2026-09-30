import { z } from "zod";
const metric = z.number().int().min(0).max(1000).nullable();
const feedback = z.object({ strengths: z.array(z.string().max(2000)).max(20), focus: z.array(z.string().max(2000)).max(20) });
export const playerDetailsSchema = z.object({
  pitching: z.object({ outs: metric, hitsAllowed: metric, walksAllowed: metric, strikeouts: metric, runsAllowed: metric, earnedRuns: metric }),
  fielding: z.object({ putouts: metric, assists: metric, errors: metric }),
  hittingFeedback: feedback, pitchingFeedback: feedback, fieldingFeedback: feedback
});
export type PlayerDetails = z.infer<typeof playerDetailsSchema>;
export function readDetails(value: unknown): PlayerDetails | null {
  const result = playerDetailsSchema.safeParse(value);
  return result.success ? result.data : null;
}
export const pitchingLabels = { outs: "Outs pitched", hitsAllowed: "Hits allowed", walksAllowed: "Walks allowed", strikeouts: "Pitching K", runsAllowed: "Runs allowed", earnedRuns: "Earned runs" };
export const fieldingLabels = { putouts: "Putouts", assists: "Assists", errors: "Errors" };
// Report coverage alongside totals; missing scorebook values are never counted as zero.
export function metricTotal(lines: { details: unknown }[], area: "pitching" | "fielding", key: string) {
  const values = lines.map(l => {
    const d = readDetails(l.details);
    return d ? (d[area] as Record<string, number | null>)[key] : null;
  }).filter((v): v is number => typeof v === "number");
  return values.length ? `${values.reduce((a, b) => a + b, 0)} (${values.length} games recorded)` : "Not recorded";
}
