"use client";

import SaveGame, { type RosterOption, type TournamentOption } from "./save-game";
import { useState } from "react";
import type { GameAnalysis, PracticePlan } from "@/types";

export default function AnalyzeClient({ teamName, teamId, roster, tournaments, seasons }: { teamName: string; teamId: string; roster: RosterOption[]; tournaments: TournamentOption[]; seasons: { id: string; name: string }[] }) {
  const [sourceHash, setSourceHash] = useState("");
  const [analysisTeamId, setAnalysisTeamId] = useState(teamId);
  const [analysisVersion, setAnalysisVersion] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!file) return;
    setLoading(true); setError(""); setPlan(null); setAnalysis(null); setSourceHash("");
    try {
      const form = new FormData(); form.append("scorebook", file);
      const response = await fetch("/api/analyze", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Analysis failed");
      if (body.teamId !== teamId) throw new Error("Your active team changed. Refresh this page before analyzing again.");
      setAnalysis(body.analysis); setSourceHash(body.sourceHash); setAnalysisTeamId(body.teamId); setAnalysisVersion(v => v + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect. Please try again."); }
    finally { setLoading(false); }
  }
  async function buildPlan() {
    if (!analysis) return;
    setPlanLoading(true); setError("");
    try {
      const response = await fetch("/api/practice-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priorities: analysis.priorities, durationMinutes: 75, teamId: analysisTeamId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Plan failed");
      setPlan(body.plan);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect. Please try again."); }
    finally { setPlanLoading(false); }
  }

  return (
    <div className="shell page">
      <span className="eyebrow">CORE ENGINE 01</span>

      <h1>Scorebook Analyzer</h1>
      <p className="team-context">Analyzing for <strong>{teamName}</strong></p>

      <p className="lede">
        Upload a scorebook photo, PDF, or GameChanger CSV. Dugout2Home
        analyzes what happened and turns the game into team and player
        development priorities.
      </p>

      <div className="upload-card">
        <input
          type="file"
          accept="image/*,application/pdf,text/csv,.csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          className="button primary"
          disabled={!file || loading}
          onClick={analyze}
        >
          {loading ? "Analyzing…" : "Analyze game"}
        </button>

        {file && (
          <small>
            Selected: {file.name}
          </small>
        )}

        <small>
          Accepted formats: scorebook photo, PDF, or GameChanger CSV
        </small>

        {error && <p className="error">{error}</p>}
      </div>

      {analysis && sourceHash && <SaveGame key={analysisVersion} analysis={analysis} sourceHash={sourceHash} teamId={analysisTeamId} roster={roster} tournaments={tournaments} seasons={seasons} />}
      {analysis && (
        <>
          <section className="score-strip">
            <div>
              <span>Opponent</span>
              <strong>{analysis.opponent}</strong>
            </div>

            <div>
              <span>Score</span>
              <strong>
                {analysis.score.us}–{analysis.score.them}
              </strong>
            </div>

            <div>
              <span>Confidence</span>
              <strong>{Math.round(analysis.confidence * 100)}%</strong>
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">GAME RECAP</span>
            <h2>What happened</h2>
            <p>{analysis.summary}</p>
          </section>

          <section className="two-col">
            <div className="panel">
              <span className="eyebrow">EXCELLED AT</span>

              <ul>
                {analysis.excelledAt.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="panel">
              <span className="eyebrow">WORK ON</span>

              <ul>
                {analysis.workOn.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">DEVELOPMENT PRIORITIES</span>
                <h2>What the game says to practice next</h2>
              </div>

              <button
                className="button primary"
                onClick={buildPlan}
                disabled={planLoading}
              >
                {planLoading
                  ? "Building…"
                  : "Build 75-min practice"}
              </button>
            </div>

            <div className="priority-list">
              {analysis.priorities.map((priority, index) => (
                <div key={index}>
                  <span className={`pill ${priority.level}`}>
                    {priority.level}
                  </span>

                  <div>
                    <strong>
                      {priority.area.replaceAll("_", " ")}
                    </strong>

                    <small>{priority.evidence}</small>
                    <small>{priority.recommendation}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">PLAYER OUTPUT</span>
            <h2>Game-level player development</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>PA</th>
                    <th>H</th>
                    <th>BB</th>
                    <th>K</th>
                    <th>R</th>
                    <th>RBI</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.playerSummaries.map((player) => (
                    <tr key={player.player}>
                      <td>{player.player}</td>
                      <td>{player.plateAppearances}</td>
                      <td>{player.hits}</td>
                      <td>{player.walks}</td>
                      <td>{player.strikeouts}</td>
                      <td>{player.runs}</td>
                      <td>{player.rbi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {plan && (
        <section className="panel practice-output">
          <span className="eyebrow">GENERATED PRACTICE</span>

          <h2>{plan.title}</h2>

          <p>{plan.focus.join(" • ")}</p>

          {plan.blocks.map((block, index) => (
            <div className="practice-block" key={index}>
              <b>{block.minutes} min</b>

              <div>
                <strong>{block.title}</strong>
                <small>{block.purpose}</small>
                <small>{block.setup}</small>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}