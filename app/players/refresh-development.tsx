"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecoveryPreview } from "@/lib/development-recovery";
import { pitchingLabels, fieldingLabels, readDetails } from "@/lib/player-details";

export default function RefreshDevelopment({ teamId, games }: { teamId: string; games: { id: string; label: string }[] }) {
  const router = useRouter();
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [preview, setPreview] = useState<RecoveryPreview | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  async function run(action: "preview" | "save") {
    setBusy(true); setError(""); setMessage("");
    if (action === "preview") setPreview(null);
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/development`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "preview" ? { action, teamId } : { action, teamId, revision: preview?.revision, players: preview?.players })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not refresh development.");
      if (action === "preview") setPreview(data);
      else { setPreview(null); setMessage(data.message); router.refresh(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="panel form-stack"><h2>Refresh saved game development</h2>
    <p>Older game notes may contain pitching and fielding evidence that was never added to these sections. Build a preview from a saved game, review it, then save the missing details. This updates the existing game without adding its stats twice.</p>
    <p>Only information present in the saved notes and analysis can be recovered. If those sources omit pitching or fielding information, the values stay blank.</p>
    <label>Saved game<select value={gameId} disabled={busy} onChange={e => { setGameId(e.target.value); setPreview(null); setMessage(""); setError(""); }}><option value="">Choose game…</option>{games.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
    <button className="button secondary" disabled={busy || !gameId} onClick={() => run("preview")}>{busy ? "Working…" : "Build development preview"}</button>
    {preview && <fieldset disabled={busy}><legend>Review recovered development</legend><p>Previously recorded numbers are locked. Correct any new values or observations before saving. Blank means unknown; pitching workload uses outs, not decimal innings.</p>
      {preview.players.map((p, index) => <details key={p.playerId} className="membership"><summary>{p.name}</summary>
        <h4>Supporting saved evidence</h4>{p.evidence.length ? <ul>{p.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p>No additional source excerpts were found.</p>}
        {(["pitching", "fielding"] as const).map(area => <div key={area}><h4>{area}</h4><div className="stat-inputs">{Object.entries(area === "pitching" ? pitchingLabels : fieldingLabels).map(([key, label]) => {
          const old = readDetails(p.previousDetails);
          const locked = old ? (old[area] as Record<string, number | null>)[key] !== null : false;
          return <label key={key}>{label}{locked ? " (saved)" : ""}<input type="number" min={0} max={1000} disabled={locked} placeholder="Unknown" value={(p.details[area] as Record<string, number | null>)[key] ?? ""} onChange={e => {
            const value = e.target.value === "" ? null : e.target.valueAsNumber;
            setPreview(current => current && ({ ...current, players: current.players.map((row, i) => i === index ? { ...row, details: { ...row.details, [area]: { ...row.details[area], [key]: value } } } : row) }));
          }} /></label>;
        })}</div></div>)}
        {(["hittingFeedback", "pitchingFeedback", "fieldingFeedback"] as const).map(area => <div key={area}><h4>{area.replace("Feedback", " observations")}</h4>{(["strengths", "focus"] as const).map(kind => <label key={kind}>{kind} (one per line)<textarea rows={4} value={p.details[area][kind].join("\n")} onChange={e => {
          const value = e.target.value.split("\n");
          setPreview(current => current && ({ ...current, players: current.players.map((row, i) => i === index ? { ...row, details: { ...row.details, [area]: { ...row.details[area], [kind]: value } } } : row) }));
        }} /></label>)}</div>)}
      </details>)}
      <p>Saving fills missing fields and adds observations. Existing reviewed observations are retained.</p>
      <button className="button primary" disabled={busy} onClick={() => run("save")}>Save reviewed development</button>
    </fieldset>}
    {message && <p className="success" role="status">{message}</p>}{error && <p className="error" role="alert">{error}</p>}
  </section>;
}
