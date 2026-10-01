import { SeasonSnapshot, snapshotFeedback } from "@/lib/season-csv";
export default function SeasonStatistics({ seasons }: { seasons: { id: string; name: string; csvSnapshot: unknown }[] }) {
  return <>{seasons.filter(s => s.csvSnapshot).map(s => {
    const snapshot = s.csvSnapshot as SeasonSnapshot;
    return <section className="panel" key={s.id}><h2>{s.name} · GameChanger cumulative statistics</h2><p>{snapshot.coverage} · Imported {new Date(snapshot.importedAt).toLocaleDateString("en-US", { timeZone: "UTC" })} · {snapshot.filename}</p><p>These are cumulative export totals, separate from the saved-game totals below. They are never added together. Feedback describes this export, not a particular game or improvement over time. Removing a saved game does not change these totals; import a corrected export if needed.</p>{snapshot.categories.map(c => <details key={c} open><summary>{c[0].toUpperCase() + c.slice(1)}</summary><div className="table-wrap"><table><thead><tr><th>Player</th><th>Export totals</th><th>Strengths</th><th>Development focus</th></tr></thead><tbody>{snapshot.players.map(p => {
      const feedback = snapshotFeedback(p, c);
      return <tr key={p.playerId}><td><a href={`#player-${p.playerId}`}>{p.name}</a></td><td>{Object.entries(p.stats[c]).map(([k, v]) => <div key={k}>{k === "IP" ? "Innings pitched" : k}: {v === null ? "Not recorded" : k === "IP" ? `${Math.floor(v / 3)}.${v % 3}` : v}</div>)}</td><td>{feedback.strengths.join(" ") || "No supporting observation in these counts."}</td><td>{feedback.focus.join(" ") || "Use coach observations and game notes to choose the next focus."}</td></tr>;
    })}</tbody></table></div></details>)}</section>;
  })}</>;
}
