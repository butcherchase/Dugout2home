import { z } from "zod";

export const categories = ["batting", "pitching", "fielding"] as const;
export type Category = typeof categories[number];
export type CsvPlayer = { row: number; name: string; jersey: string; stats: Record<Category, Record<string, number | null>> };
export type SeasonSnapshot = { version: string; importedAt: string; importedBy: string; filename: string; coverage: string; categories: Category[]; players: (CsvPlayer & { playerId: string })[] };
export const importSchema = z.object({ action: z.enum(["preview", "save"]), seasonId: z.string().min(1), csv: z.string().min(1).max(1000000), filename: z.string().min(1).max(200), coverage: z.string().trim().min(1).max(200), categories: z.array(z.enum(categories)).min(1).max(3), version: z.string().nullable().optional(), matches: z.array(z.object({ row: z.number().int().nonnegative(), playerId: z.string() })).max(200).optional() });

// CSV headers repeat across categories; preserve their positions rather than using a flat dictionary.
export function csvRows(text: string) {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell.trim()); cell = "";
      if (c !== ",") { if (row.some(Boolean)) rows.push(row); row = []; if (c === "\r" && text[i + 1] === "\n") i++; }
    } else cell += c;
  }
  if (quoted) throw new Error("CSV has an unfinished quoted value.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function parseSeasonCsv(text: string): CsvPlayer[] {
  const rows = csvRows(text); const groups = rows[0], headers = rows[1];
  if (!groups || !headers || headers[0] !== "Number" || headers[1] !== "Last" || headers[2] !== "First") throw new Error("Use the original GameChanger Export Stats CSV with both header rows.");
  const starts = categories.map(c => groups.findIndex(v => v.toLowerCase() === c));
  if (starts.some(i => i < 3) || !(starts[0] < starts[1] && starts[1] < starts[2])) throw new Error("Expected Batting, Pitching and Fielding sections.");
  const required: Record<Category, string[]> = { batting: ["GP", "PA", "AB", "H", "BB", "SO", "R", "RBI"], pitching: ["GP", "IP", "H", "BB", "SO", "R", "ER"], fielding: ["PO", "A", "E", "TC"] };
  const indices = Object.fromEntries(categories.map((c, n) => [c, Object.fromEntries(required[c].map(k => {
    const index = headers.findIndex((h, i) => h === k && i >= starts[n] && i < (starts[n + 1] ?? headers.length));
    if (index < 0) throw new Error(`Missing ${c} column: ${k}`); return [k, index];
  }))])) as Record<Category, Record<string, number>>;
  const players: CsvPlayer[] = [];
  for (const row of rows.slice(2)) {
    if (["totals", "total", "glossary"].includes(row[0]?.toLowerCase())) continue;
    if (!row[2] || row[2].toLowerCase() === "totals") continue;
    if (row.length !== headers.length) throw new Error("A player row has the wrong number of columns.");
    const stats = {} as CsvPlayer["stats"];
    for (const c of categories) {
      stats[c] = {};
      for (const [key, index] of Object.entries(indices[c])) {
        const raw = row[index];
        if (["", "-", "N/A"].includes(raw)) { stats[c][key] = null; continue; }
        if (key === "IP") {
          if (!/^\d+(\.[012])?$/.test(raw)) throw new Error(`Invalid innings pitched: ${raw}`);
          const [innings, outs = "0"] = raw.split("."); stats[c][key] = Number(innings) * 3 + Number(outs);
        } else {
          const value = Number(raw);
          if (!Number.isSafeInteger(value) || value < 0 || value > 1000000) throw new Error(`Invalid ${c} ${key} count.`);
          stats[c][key] = value;
        }
      }
    }
    players.push({ row: players.length, name: `${row[2]} ${row[1]}`.trim(), jersey: row[0], stats });
  }
  if (!players.length || players.length > 200) throw new Error("Expected 1–200 player rows.");
  return players;
}

export function snapshotFeedback(p: CsvPlayer, c: Category) {
  const s = p.stats[c]; const strengths: string[] = [], focus: string[] = [];
  if (c === "batting") {
    if (s.H) strengths.push(`${s.H} hits in ${s.PA ?? "unknown"} plate appearances.`);
    if (s.BB) strengths.push(`${s.BB} walks earned.`);
    if (s.SO) focus.push(`${s.SO} strikeouts: practice two-strike contact and pitch recognition.`);
  } else if (c === "pitching" && (s.GP || s.IP)) {
    if (s.SO) strengths.push(`${s.SO} pitching strikeouts.`);
    if (s.BB === 0) strengths.push("No walks allowed in this export.");
    if (s.BB) focus.push(`${s.BB} walks allowed: practice repeatable strike-zone targets.`);
    if (s.H) focus.push(`${s.H} hits allowed: review pitch locations with the coach.`);
  } else if (c === "fielding" && s.TC) {
    if (s.PO) strengths.push(`${s.PO} putouts recorded.`);
    if (s.A) strengths.push(`${s.A} assists recorded.`);
    if (s.E === 0) strengths.push(`No errors across ${s.TC} recorded chances.`);
    if (s.E) focus.push(`${s.E} errors: review the plays and practice clean fielding and accurate throws.`);
  }
  return { strengths, focus };
}
