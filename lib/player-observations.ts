import { PlayerDetails, readDetails } from "./player-details";

export type ObservationLine = { plateAppearances: number; hits: number; walks: number; strikeouts: number; details: unknown };
export type SkillArea = "hitting" | "pitching" | "fielding";
export const emptyDetails = (): PlayerDetails => ({
  pitching: { outs: null, hitsAllowed: null, walksAllowed: null, strikeouts: null, runsAllowed: null, earnedRuns: null },
  fielding: { putouts: null, assists: null, errors: null },
  hittingFeedback: { strengths: [], focus: [] }, pitchingFeedback: { strengths: [], focus: [] }, fieldingFeedback: { strengths: [], focus: [] }
});
const unique = (values: string[]) => [...new Set(values.map(v => v.trim()).filter(Boolean))];

// Recovery fills gaps. Previously reviewed numbers and observations stay intact.
export function mergeDetails(previous: unknown, incoming: PlayerDetails): PlayerDetails {
  const old = readDetails(previous) ?? emptyDetails();
  const merged = structuredClone(old);
  for (const area of ["pitching", "fielding"] as const) {
    for (const key of Object.keys(old[area])) {
      (merged[area] as Record<string, number | null>)[key] = (old[area] as Record<string, number | null>)[key] ?? (incoming[area] as Record<string, number | null>)[key];
    }
  }
  for (const area of ["hittingFeedback", "pitchingFeedback", "fieldingFeedback"] as const) {
    merged[area] = { strengths: unique([...old[area].strengths, ...incoming[area].strengths]).slice(0, 20), focus: unique([...old[area].focus, ...incoming[area].focus]).slice(0, 20) };
  }
  return merged;
}

// These are transparent summaries of saved counts, not invented scouting grades.
export function playerObservations(lines: ObservationLine[], area: SkillArea) {
  const structured = lines.map(l => readDetails(l.details)).filter(d => d !== null);
  const feedback = structured.map(d => d[`${area}Feedback`]);
  const strengths = unique(feedback.flatMap(f => f.strengths));
  const focus = unique(feedback.flatMap(f => f.focus));
  const facts: string[] = [], drills: string[] = [];
  if (area === "hitting") {
    const sum = (key: "hits" | "walks" | "strikeouts" | "plateAppearances") => lines.reduce((n, l) => n + l[key], 0);
    const hits = sum("hits"), walks = sum("walks"), strikeouts = sum("strikeouts"), pa = sum("plateAppearances");
    if (hits) facts.push(`${hits} hits recorded in ${pa} plate appearances.`);
    if (walks) facts.push(`Reached base on ${walks} walks.`);
    if (pa && !strikeouts) facts.push(`No strikeouts recorded in ${pa} plate appearances.`);
    if (strikeouts) drills.push(`${strikeouts} strikeouts in ${pa} plate appearances: practice two-strike contact and pitch recognition.`);
    if (pa && !hits) drills.push(`No hits recorded in ${pa} plate appearances: use controlled contact drills and track the next games before drawing conclusions.`);
    if (pa && !drills.length) drills.push(`Build on these ${pa} plate appearances with contact-quality and pitch-selection practice.`);
  } else {
    const metric = (key: string) => {
      const values = structured.map(d => (d[area] as Record<string, number | null>)[key]).filter((n): n is number => typeof n === "number");
      return { total: values.reduce((a, b) => a + b, 0), games: values.length };
    };
    if (area === "pitching") {
      const k = metric("strikeouts"), bb = metric("walksAllowed"), outs = metric("outs"), hits = metric("hitsAllowed");
      if (k.total) facts.push(`${k.total} pitching strikeouts across ${k.games} games with strikeout data.`);
      if (outs.total) facts.push(`${outs.total} pitching outs recorded across ${outs.games} games with workload data.`);
      if (bb.games && !bb.total) facts.push(`No walks allowed in ${bb.games} games with walk data.`);
      if (bb.total) drills.push(`${bb.total} walks allowed across ${bb.games} recorded games: work on repeatable strike-zone targets.`);
      if (hits.total) drills.push(`${hits.total} hits allowed across ${hits.games} recorded games: review pitch location with the coach and practice hitting targets.`);
      if (!drills.length && (outs.games || k.games || bb.games)) drills.push("Continue command and target practice; the saved pitching counts alone do not establish a mechanical flaw.");
    } else {
      const putouts = metric("putouts"), assists = metric("assists"), errors = metric("errors");
      if (putouts.total) facts.push(`${putouts.total} putouts recorded across ${putouts.games} games.`);
      if (assists.total) facts.push(`${assists.total} assists recorded across ${assists.games} games.`);
      if (errors.games && !errors.total) facts.push(`No errors recorded in ${errors.games} games with error data.`);
      if (errors.total) drills.push(`${errors.total} errors recorded across ${errors.games} games: review those plays and practice clean fielding and accurate throws.`);
      if (!drills.length && (putouts.games || assists.games || errors.games)) drills.push("Reinforce clean fielding and accurate throws; use play-specific notes to choose the next drill.");
    }
  }
  return { strengths: unique([...facts, ...strengths]), focus: unique([...drills, ...focus]) };
}
