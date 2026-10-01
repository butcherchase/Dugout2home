import { playerObservations } from "@/lib/player-observations";
import Link from "next/link";
import { totalStats } from "@/lib/game-data";
import { metricTotal, pitchingLabels, fieldingLabels } from "@/lib/player-details";
type Line = { plateAppearances: number; hits: number; walks: number; strikeouts: number; runs: number; rbi: number; details: unknown };
export default function TeamBreakdown({ players }: { players: { id: string; firstName: string; lastName: string | null; gameLines: Line[] }[] }) {
  return <section className="panel"><h2>Team hitting, pitching & fielding</h2><p>Totals reflect the selected season. Pitching and fielding totals show how many games actually recorded each metric. Missing data is not counted as zero.</p>
    {(["hitting", "pitching", "fielding"] as const).map(area => <details className="membership" key={area} open={area === "hitting"}><summary>{area[0].toUpperCase() + area.slice(1)} · {players.length} players</summary><div className="table-wrap"><table><thead><tr><th>Player</th><th>Recorded results</th><th>Strengths</th><th>Development focus</th></tr></thead><tbody>{players.map(player => {
      const stats = totalStats(player.gameLines);
      const { strengths, focus } = playerObservations(player.gameLines, area);
      return <tr key={player.id}><td><Link href={`#player-${player.id}`}>{player.firstName} {player.lastName}</Link></td><td>{area === "hitting" ? `${player.gameLines.length} games · ${stats.plateAppearances} PA · ${stats.hits} H · ${stats.walks} BB · ${stats.strikeouts} K · ${stats.runs} R · ${stats.rbi} RBI` : Object.entries(area === "pitching" ? pitchingLabels : fieldingLabels).map(([key, label]) => <div key={key}>{label}: {metricTotal(player.gameLines, area, key)}</div>)}</td><td>{strengths.length ? <ul>{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul> : (area === "hitting" ? "No supporting batting evidence saved yet." : `No ${area} observation saved yet. Use Refresh saved game development below to recover information from older notes.`)}</td><td>{focus.length ? <ul>{focus.map((s, i) => <li key={i}>{s}</li>)}</ul> : (area === "hitting" ? "No supporting batting evidence saved yet." : `No ${area} observation saved yet. Use Refresh saved game development below to recover information from older notes.`)}</td></tr>;
    })}</tbody></table></div></details>)}
  </section>;
}
