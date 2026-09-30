"use client";
import Link from "next/link";
import { useRef } from "react";
import { GameList } from "./game-list";
import { recordFor } from "@/lib/game-data";
type Game = { id: string; opponent: string; playedAt: Date; runsFor: number | null; runsAgainst: number | null; tournamentId: string | null; seasonId: string | null; tournament: { name: string } | null };
export default function SeasonFolders({ seasons, tournaments, games, filtered }: {
  seasons: { id: string; name: string }[]; tournaments: { id: string; name: string; seasonId: string | null }[]; games: Game[]; filtered: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const folders = [...seasons, { id: "", name: "Unassigned season" }];
  return <div ref={root}><div className="actions"><button type="button" className="button secondary" onClick={() => root.current?.querySelectorAll("details").forEach(d => d.open = false)}>Collapse all</button><button type="button" className="button secondary" onClick={() => root.current?.querySelectorAll("details").forEach(d => d.open = true)}>Expand all</button></div>
    {folders.map(season => {
      const seasonGames = games.filter(g => (g.seasonId ?? "") === season.id);
      const seasonTournaments = tournaments.filter(t => (t.seasonId ?? "") === season.id && (!filtered || seasonGames.some(g => g.tournamentId === t.id)));
      if (!seasonGames.length && !seasonTournaments.length && (filtered || !season.id)) return null;
      const standalone = seasonGames.filter(g => !g.tournamentId);
      return <details className="panel season-folder" key={season.id} open={filtered || undefined}><summary>{season.name} · {seasonGames.length} {filtered ? "matching " : ""}games · {recordFor(seasonGames)} W–L–T</summary>
        {!seasonGames.length && !seasonTournaments.length && <p>Your season is ready. Select it when saving a game or creating a tournament.</p>}
        {seasonTournaments.map(t => { const list = seasonGames.filter(g => g.tournamentId === t.id); return <details className="membership" key={t.id} open={filtered || undefined}><summary>{t.name} · {list.length} games</summary><p><Link href={`/recaps/tournaments/${t.id}`}>Open tournament recap →</Link></p>{list.length ? <GameList games={list} /> : <p>No games saved yet.</p>}</details>; })}
        {standalone.length > 0 && <details className="membership" open={filtered || undefined}><summary>Standalone games ({standalone.length})</summary><GameList games={standalone} /></details>}
      </details>;
    })}
  </div>;
}
