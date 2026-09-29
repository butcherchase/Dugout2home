import { demoPlayers } from "@/lib/demo";

export default function PlayersPage() {
  return <div className="shell page"><span className="eyebrow">CORE ENGINE 02</span><h1>Player Development</h1><p className="lede">A living blueprint that combines coach evaluations with game evidence.</p><div className="player-grid">{demoPlayers.map((p,i) => <article className="panel" key={p.name}><div className="big-avatar">{p.name[0]}</div><h2>{p.name}</h2><span className="trend">{p.trend} development trend</span><hr/><small className="label">CURRENT FOCUS</small><strong>{p.focus}</strong><small className="label">CURRENT STRENGTH</small><strong>{p.strength}</strong><div className="skill-bars"><label>Hitting <span style={{width:`${76+i*3}%`}}/></label><label>Defense <span style={{width:`${68+i*5}%`}}/></label><label>Baserunning <span style={{width:`${64+i*4}%`}}/></label></div></article>)}</div></div>;
}
