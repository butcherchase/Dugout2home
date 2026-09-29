"use client";

import { useState } from "react";
import type { GameAnalysis, PracticePlan } from "@/types";

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!file) return;
    setLoading(true); setError(""); setPlan(null);
    const form = new FormData(); form.append("scorebook", file);
    const res = await fetch("/api/analyze", { method: "POST", body: form });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Analysis failed"); else setAnalysis(body.analysis);
    setLoading(false);
  }

  async function buildPlan() {
    if (!analysis) return;
    setPlanLoading(true); setError("");
    const res = await fetch("/api/practice-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priorities: analysis.priorities, durationMinutes: 75, ageGroup: "10U" }) });
    const body = await res.json();
    if (!res.ok) setError(body.error || "Plan failed"); else setPlan(body.plan);
    setPlanLoading(false);
  }

  return <div className="shell page">
    <span className="eyebrow">CORE ENGINE 01</span><h1>Scorebook Analyzer</h1>
    <p className="lede">Upload a scorebook photo. Dugout2Home extracts what happened and turns it into development priorities—not just a text recap.</p>
    <div className="upload-card">
      <input type="file" accept="image/*" capture="environment" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button className="button primary" disabled={!file || loading} onClick={analyze}>{loading ? "Analyzing…" : "Analyze scorebook"}</button>
      {file && <small>{file.name}</small>}{error && <p className="error">{error}</p>}
    </div>

    {analysis && <>
      <section className="score-strip"><div><span>Opponent</span><strong>{analysis.opponent}</strong></div><div><span>Score</span><strong>{analysis.score.us}–{analysis.score.them}</strong></div><div><span>Confidence</span><strong>{Math.round(analysis.confidence * 100)}%</strong></div></section>
      <section className="two-col">
        <div className="panel"><span className="eyebrow">EXCELLED AT</span><ul>{analysis.excelledAt.map(x => <li key={x}>{x}</li>)}</ul></div>
        <div className="panel"><span className="eyebrow">WORK ON</span><ul>{analysis.workOn.map(x => <li key={x}>{x}</li>)}</ul></div>
      </section>
      <section className="panel"><div className="panel-head"><div><span className="eyebrow">DEVELOPMENT PRIORITIES</span><h2>What the game says to practice next</h2></div><button className="button primary" onClick={buildPlan} disabled={planLoading}>{planLoading ? "Building…" : "Build 75-min practice"}</button></div>
        <div className="priority-list">{analysis.priorities.map((p,i) => <div key={i}><span className={`pill ${p.level}`}>{p.level}</span><div><strong>{p.area.replaceAll("_", " ")}</strong><small>{p.evidence}</small><small>{p.recommendation}</small></div></div>)}</div>
      </section>
      <section className="panel"><span className="eyebrow">PLAYER OUTPUT</span><h2>Game-level player development</h2><div className="table-wrap"><table><thead><tr><th>Player</th><th>PA</th><th>H</th><th>BB</th><th>K</th><th>R</th><th>RBI</th></tr></thead><tbody>{analysis.playerSummaries.map(p => <tr key={p.player}><td>{p.player}</td><td>{p.plateAppearances}</td><td>{p.hits}</td><td>{p.walks}</td><td>{p.strikeouts}</td><td>{p.runs}</td><td>{p.rbi}</td></tr>)}</tbody></table></div></section>
    </>}

    {plan && <section className="panel practice-output"><span className="eyebrow">GENERATED PRACTICE</span><h2>{plan.title}</h2><p>{plan.focus.join(" • ")}</p>{plan.blocks.map((b,i) => <div className="practice-block" key={i}><b>{b.minutes} min</b><div><strong>{b.title}</strong><small>{b.purpose}</small><small>{b.setup}</small></div></div>)}</section>}
  </div>;
}
