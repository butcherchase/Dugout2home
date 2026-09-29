import { demoPriorities } from "@/lib/demo";

export default function PracticePage() {
  const blocks = [[10,"Warmup + throwing progression"],[15,"Baserunning reads"],[20,"Situational hitting stations"],[15,"Throwing accuracy / cutoffs"],[10,"Live game situations"],[5,"Competitive finish"]];
  return <div className="shell page"><span className="eyebrow">CORE ENGINE 03</span><h1>Practice Planner</h1><p className="lede">The practice plan should be the output of your development data, not a separate feature.</p><section className="two-col"><div className="panel"><span className="eyebrow">WHY THIS PRACTICE</span><h2>Latest evidence</h2><div className="priority-list">{demoPriorities.map(p => <div key={p.area}><span className={`pill ${p.level.toLowerCase()}`}>{p.level}</span><div><strong>{p.area}</strong><small>{p.evidence}</small></div></div>)}</div></div><div className="panel"><span className="eyebrow">75 MINUTES</span><h2>Recommended flow</h2>{blocks.map(([m,n]) => <div className="practice-block" key={String(n)}><b>{m} min</b><strong>{n}</strong></div>)}</div></section></div>;
}
