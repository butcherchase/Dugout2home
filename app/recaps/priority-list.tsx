import type { combinedPriorities } from "@/lib/game-data";
export function PriorityList({ priorities }: { priorities: ReturnType<typeof combinedPriorities> }) {
  return <div>{priorities.map(priority => <article className="membership" key={priority.area}><span className={`pill ${priority.level}`}>{priority.level}</span><h3>{priority.area.replaceAll("_", " ")}</h3><p>Flagged in {priority.games} saved {priority.games === 1 ? "game" : "games"}.</p><ul>{priority.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul><details><summary>Game evidence</summary><ul>{priority.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul></details></article>)}</div>;
}
