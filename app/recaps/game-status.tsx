"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GameStatus({ teamId, gameId, opponent, version, removed = false }: {
  teamId: string; gameId: string; opponent: string; version: string; removed?: boolean;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function update() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, version, action: removed ? "restore" : "remove" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update game.");
      router.push(removed ? `/recaps/games/${gameId}` : "/recaps/removed"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not connect."); setBusy(false); }
  }
  return <div className="form-stack">
    {!confirm ? <button className="button secondary" disabled={busy} onClick={() => setConfirm(true)}>{removed ? "Restore game" : "Remove game"}</button> : <div role="group" aria-label={removed ? "Confirm restore" : "Confirm removal"}>
      <p>{removed ? `Restore the game against ${opponent} and include it in totals again?` : `Remove the game against ${opponent} from game logs, player totals, tournament records and practice evidence?`}</p>
      <p>{removed ? "The original results and tournament assignment will be restored." : "The game moves to Removed games. You can restore it later; roster players and their accounts stay intact."}</p>
      <div className="actions"><button className="button primary" disabled={busy} onClick={update}>{busy ? "Updating…" : removed ? "Confirm restore" : "Confirm removal"}</button><button className="button secondary" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button></div>
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
