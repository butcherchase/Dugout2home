"use client";
import { useState } from "react";
import type { DevelopmentPriority, PracticePlan } from "@/types";
export default function GeneratePlan({ priorities, teamId }: { priorities: DevelopmentPriority[]; teamId: string }) {
  const [minutes, setMinutes] = useState(75);
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function generate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setPlan(null);
    try {
      const response = await fetch("/api/practice-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priorities, durationMinutes: minutes, teamId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not build a practice plan.");
      setPlan(data.plan);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed. Please try again."); }
    finally { setLoading(false); }
  }
  return <section className="panel"><h2>Build the next practice</h2><form onSubmit={generate} className="form-stack inline-select"><label>Practice length (minutes)<input type="number" value={minutes} min={30} max={180} required onChange={e => setMinutes(e.target.valueAsNumber)} /></label><button className="button primary" disabled={loading || !priorities.length}>{loading ? "Building practice…" : "Generate practice plan"}</button></form>{!priorities.length && <p>No practice priorities are available for this selection.</p>}{error && <p className="error" role="alert">{error}</p>}
    {plan && <div aria-live="polite"><h2>{plan.title}</h2><p>{plan.focus.join(" · ")}</p>{plan.blocks.map((block, i) => <div className="practice-block" key={i}><b>{block.minutes} min</b><div><strong>{block.title}</strong><small>{block.purpose}</small><small>{block.setup}</small></div></div>)}<h3>Coach notes</h3><ul>{plan.coachNotes.map((n, i) => <li key={i}>{n}</li>)}</ul><p className="muted">This generated plan is displayed for this visit. Your source games and priorities stay saved.</p></div>}
  </section>;
}
