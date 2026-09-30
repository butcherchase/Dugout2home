"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pitchingLabels, fieldingLabels } from "@/lib/player-details";
import type { GameAnalysis } from "@/types";
import { dateSchema, normalizeName, statKeys, statLabels } from "@/lib/game-data";

export type RosterOption = { id: string; firstName: string; lastName: string | null; jersey: string | null };
export type TournamentOption = { id: string; name: string; seasonId: string | null };
export default function SaveGame({ analysis, sourceHash, teamId, roster, tournaments, seasons }: {
  analysis: GameAnalysis; sourceHash: string; teamId: string; roster: RosterOption[]; tournaments: TournamentOption[]; seasons: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [opponent, setOpponent] = useState(analysis.opponent);
  const [date, setDate] = useState(dateSchema.safeParse(analysis.gameDate).success ? analysis.gameDate : "");
  const [us, setUs] = useState(analysis.score.us);
  const [them, setThem] = useState(analysis.score.them);
  const [seasonId, setSeasonId] = useState("");
  const [tournament, setTournament] = useState("");
  const [newName, setNewName] = useState("");
  const [lines, setLines] = useState(analysis.playerSummaries);
  const [targets, setTargets] = useState(() => analysis.playerSummaries.map(line => {
    const matches = roster.filter(player => normalizeName(`${player.firstName} ${player.lastName ?? ""}`) === normalizeName(line.player));
    return matches.length === 1 ? matches[0].id : "";
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<{ id: string; duplicate: boolean } | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        teamId, seasonId, sourceHash, opponent, gameDate: date, runsFor: us, runsAgainst: them,
        tournamentId: tournament === "new" ? "" : tournament, newTournamentName: tournament === "new" ? newName : "",
        analysis: { ...analysis, playerSummaries: lines }, playerTargets: targets
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not save this game.");
      setSaved(body); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect. Please try again."); }
    finally { setSaving(false); }
  }
  if (saved) return <section className="panel saved-game" role="status"><span className="eyebrow">{saved.duplicate ? "ALREADY IN YOUR GAME LOG" : "GAME SAVED"}</span><h2>{saved.duplicate ? "This scorebook was saved earlier" : "Your game is now part of the story"}</h2>
    <p>{saved.duplicate ? "We kept the original saved game and did not add its stats twice." : "Matched player results are now included in Player Development. This game is available in Recaps and Practice."}</p>
    <div className="actions"><Link className="button primary" href={`/recaps/games/${saved.id}`}>Open saved game</Link><Link className="button secondary" href="/players">View players</Link><Link className="button secondary" href={`/practice?gameId=${saved.id}`}>Plan practice</Link></div>
  </section>;

  return <section className="panel save-game"><span className="eyebrow">KEEP THIS GAME</span><h2>Review and save game</h2>
    <p>Analysis is not saved until you click Save game. Confirm the score, date, and player matches. AI results may need corrections.</p>
    <form onSubmit={save} className="form-stack"><fieldset disabled={saving} className="save-fields">
      <div className="form-grid">
        <label>Opponent<input value={opponent} onChange={e => setOpponent(e.target.value)} maxLength={150} required /></label>
        <label>Game date<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
        <label>Our runs<input type="number" min={0} max={1000} value={us} onChange={e => setUs(e.target.valueAsNumber)} required /></label>
        <label>Opponent runs<input type="number" min={0} max={1000} value={them} onChange={e => setThem(e.target.valueAsNumber)} required /></label>
      </div>
      <label>Season<select value={seasonId} onChange={e => { setSeasonId(e.target.value); setTournament(""); }}><option value="">Unassigned season</option>{seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><small><Link href="/recaps" target="_blank">Create seasons in Recaps</Link>, then refresh before your next upload.</small>
      <label>Tournament<select value={tournament} onChange={e => { setTournament(e.target.value); const t = tournaments.find(t => t.id === e.target.value); if (t) setSeasonId(t.seasonId ?? ""); }}><option value="">Standalone game</option>{tournaments.filter(t => (t.seasonId ?? "") === seasonId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}<option value="new">+ Create a tournament</option></select></label>
      {tournament === "new" && <label>New tournament name<input value={newName} onChange={e => setNewName(e.target.value)} maxLength={120} required placeholder="Fall Frenzy — September 2026" /></label>}
      <h3>{roster.length ? "Connect results to your players" : "Create your initial roster from this scorebook"}</h3>
      {!roster.length && <p>Use the button below to mark extracted names for your roster, then review names and skip opponent rows. Players are created when you save this game.</p>}
      <button type="button" className="button secondary" onClick={() => setTargets(current => current.map(target => target || "new"))}>Create roster players for all unmatched names</button><p>Exact names are suggested automatically. Confirm every match. Skip opponent rows or rows you do not want included in player totals.</p>
      {!lines.length && <p>No player lines were extracted. You can still save the game and team analysis.</p>}
      {lines.map((line, index) => <div className="player-match" key={index}>
        <div className="form-grid"><label>Scorebook player name<input aria-label={`Scorebook name ${index + 1}`} value={line.player} maxLength={120} required onChange={e => setLines(current => current.map((row, i) => i === index ? { ...row, player: e.target.value } : row))} /></label>
          <label>Roster match<select aria-label={`Roster match ${index + 1}`} value={targets[index]} required onChange={e => setTargets(current => current.map((target, i) => i === index ? e.target.value : target))}>
            <option value="">Choose a player…</option>{roster.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}{p.jersey ? ` #${p.jersey}` : ""}</option>)}<option value="new">Create roster player from this name</option><option value="skip">Skip this player’s stats</option>
          </select></label></div>
        {targets[index] !== "skip" && <div className="stat-inputs">{statKeys.map((key, i) => <label key={key}>{statLabels[i]}<input aria-label={`${line.player} ${statLabels[i]}`} type="number" min={0} max={1000} required value={line[key]} onChange={e => setLines(current => current.map((row, j) => j === index ? { ...row, [key]: e.target.valueAsNumber } : row))} /></label>)}</div>}
        {targets[index] !== "skip" && line.details && <details><summary>Review pitching, fielding & development notes</summary>
          {(["pitching", "fielding"] as const).map(area => <div key={area}><h4>{area}</h4><div className="stat-inputs">{Object.entries(area === "pitching" ? pitchingLabels : fieldingLabels).map(([key, label]) => <label key={key}>{label}<input type="number" min={0} max={1000} placeholder="Not recorded" value={(line.details![area] as Record<string, number | null>)[key] ?? ""} onChange={e => { const value = e.target.value === "" ? null : e.target.valueAsNumber; setLines(current => current.map((row, j) => j === index && row.details ? { ...row, details: { ...row.details, [area]: { ...row.details[area], [key]: value } } } : row)); }} /></label>)}</div></div>)}
          <p>Leave unknown values blank. Outs pitched uses outs, not decimal innings.</p>
          {(["hittingFeedback", "pitchingFeedback", "fieldingFeedback"] as const).map(area => <div key={area}><h4>{area.replace("Feedback", " development")}</h4>{(["strengths", "focus"] as const).map(kind => <label key={kind}>{kind} (one observation per line)<textarea rows={3} value={line.details![area][kind].join("\n")} onChange={e => { const value = e.target.value; setLines(current => current.map((row, j) => j === index && row.details ? { ...row, details: { ...row.details, [area]: { ...row.details[area], [kind]: value.split("\n").filter(Boolean) } } } : row)); }} /></label>)}</div>)}
        </details>}
      </div>)}
      <p className="muted">Saving updates coach views. Family feedback still requires a coach to share it. Uploading the same file again will not count the game twice.</p>
      <button className="button primary" disabled={saving} type="submit">{saving ? "Saving game…" : "Save game"}</button>
    </fieldset>{error && <p className="error" role="alert">{error}</p>}</form>
  </section>;
}
