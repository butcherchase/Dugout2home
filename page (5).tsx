import Link from "next/link";
import { demoPlayers, demoPriorities } from "@/lib/demo";

const modules = [
  ["Scorebook Analyzer", "Upload a photo and turn the game into structured development intelligence.", "/analyze", "01"],
  ["Player Development", "Track strengths, priorities, and trends across practices and games.", "/players", "02"],
  ["Practice Planner", "Turn the team's biggest needs into a coach-ready practice plan.", "/practice", "03"],
  ["Game & Tournament Recaps", "See what you excelled at, what needs work, and what changed over the weekend.", "/recaps", "04"]
];

export default function Home() {
  return (
    <div className="shell">
      <section className="hero">
        <div>
          <span className="eyebrow">COACH DEVELOPMENT SYSTEM</span>
          <h1>Turn every game into a <em>development plan.</em></h1>
          <p>Dugout2Home connects scorebook analysis, player development, game recaps, and practice planning in one continuous loop.</p>
          <div className="actions">
            <Link href="/analyze" className="button primary">Analyze a scorebook</Link>
            <Link href="/practice" className="button secondary">Build practice plan</Link>
          </div>
        </div>
        <div className="hero-card">
          <p className="muted">LATEST TEAM SIGNAL</p>
          <h3>Situational hitting</h3>
          <div className="meter"><span style={{ width: "72%" }} /></div>
          <strong>Top practice priority</strong>
          <p>Four missed productive-out opportunities in the latest game.</p>
        </div>
      </section>

      <section className="module-grid">
        {modules.map(([title, copy, href, num]) => (
          <Link href={href} className="module" key={title}>
            <span>{num}</span><h3>{title}</h3><p>{copy}</p><b>Open →</b>
          </Link>
        ))}
      </section>

      <section className="two-col">
        <div className="panel">
          <div className="panel-head"><div><span className="eyebrow">PLAYER BLUEPRINT</span><h2>Development momentum</h2></div><Link href="/players">View all</Link></div>
          <div className="rows">
            {demoPlayers.map(player => <div className="player-row" key={player.name}><div className="avatar">{player.name[0]}</div><div><strong>{player.name}</strong><small>Focus: {player.focus}</small></div><div className="grow">{player.trend}</div></div>)}
          </div>
        </div>
        <div className="panel">
          <span className="eyebrow">NEXT PRACTICE</span><h2>Evidence, not guesswork</h2>
          <div className="priority-list">{demoPriorities.map(p => <div key={p.area}><span className={`pill ${p.level.toLowerCase()}`}>{p.level}</span><div><strong>{p.area}</strong><small>{p.evidence}</small></div></div>)}</div>
        </div>
      </section>
    </div>
  );
}
