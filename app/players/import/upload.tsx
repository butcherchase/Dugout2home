"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { categories, Category, CsvPlayer } from "@/lib/season-csv";
type Roster = { id: string; firstName: string; lastName: string | null; jersey: string | null };
export default function ImportCsv({ seasons, roster }: { seasons: { id: string; name: string }[]; roster: Roster[] }) {
  const router = useRouter();
  const [seasonId, setSeason] = useState(seasons[0].id), [coverage, setCoverage] = useState("");
  const [selected, setSelected] = useState<Category[]>(["pitching", "fielding"]);
  const [file, setFile] = useState<File | null>(null), [csv, setCsv] = useState("");
  const [rows, setRows] = useState<CsvPlayer[]>([]), [matches, setMatches] = useState<string[]>([]), [version, setVersion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [confirmed, setConfirmed] = useState(false);
  function reset() { setRows([]); setConfirmed(false); setError(""); }
  async function run(action: "preview" | "save") {
    setBusy(true); setError("");
    try {
      if (!file || file.size > 1000000) throw new Error("Choose a CSV no larger than 1 MB.");
      const source = action === "preview" ? await file.text() : csv;
      const response = await fetch("/api/season-csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, seasonId, coverage, categories: selected, filename: file.name, csv: source, version, matches: matches.map((playerId, row) => ({ row, playerId })) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Import failed.");
      if (action === "save") { router.push(`/players?seasonId=${encodeURIComponent(seasonId)}`); router.refresh(); }
      else {
        setCsv(source); setRows(result.players); setVersion(result.version); setConfirmed(false);
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
        setMatches(result.players.map((p: CsvPlayer) => { const found = roster.filter(r => normalize(`${r.firstName} ${r.lastName ?? ""}`) === normalize(p.name)); return found.length === 1 ? found[0].id : ""; }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); } finally { setBusy(false); }
  }
  return <section className="panel form-stack"><fieldset disabled={busy} className="form-stack"><label>Season<select value={seasonId} onChange={e => { setSeason(e.target.value); reset(); }}>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label>Export coverage<input value={coverage} maxLength={200} placeholder="Entire Fall 2026 season through October 1; all games" onChange={e => { setCoverage(e.target.value); reset(); }} /></label><p>Use the same GameChanger filters each time. Describe tournament-only or other filters here so these totals are not mistaken for the whole season.</p><label>GameChanger CSV<input type="file" accept=".csv,text/csv" onChange={e => { setFile(e.target.files?.[0] ?? null); reset(); }} /></label><div>Categories to display{categories.map(c => <label key={c}><input type="checkbox" checked={selected.includes(c)} onChange={e => { setSelected(e.target.checked ? [...selected, c] : selected.filter(v => v !== c)); reset(); }} /> {c}</label>)}</div><button className="button" disabled={!file || !coverage.trim() || !selected.length} onClick={() => run("preview")}>Preview CSV and match players</button>
    {rows.length > 0 && <><h2>Review {rows.length} players</h2><p>Check every match. Leave a row as Skip to exclude it. Add missing roster players in Team settings, then return here.</p><div className="table-wrap"><table><thead><tr><th>CSV player</th><th>Roster player</th><th>Selected statistics</th></tr></thead><tbody>{rows.map((p, i) => <tr key={p.row}><td>{p.name} {p.jersey && `#${p.jersey}`}</td><td><select aria-label={`Match ${p.name}`} value={matches[i]} onChange={e => { setMatches(matches.map((m, j) => i === j ? e.target.value : m)); setConfirmed(false); }}><option value="">Skip</option>{roster.map(r => <option key={r.id} value={r.id}>{r.firstName} {r.lastName} {r.jersey && `#${r.jersey}`}</option>)}</select></td><td>{selected.map(c => <p key={c}>{c}: {Object.entries(p.stats[c]).map(([k, v]) => `${k === "IP" ? "Pitching outs" : k} ${v ?? "not recorded"}`).join(" · ")}</p>)}</td></tr>)}</tbody></table></div><label><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I reviewed the matches and coverage. Saving replaces the entire previous CSV snapshot for this season, including its category choices. Individual games are unchanged.</label><button className="button" disabled={!confirmed || !matches.some(Boolean)} onClick={() => run("save")}>Save season statistics</button></>}
    </fieldset>{busy && <p role="status">Processing…</p>}{error && <p role="alert">{error}</p>}</section>;
}
