# Remove and restore games; protect against cumulative CSV double-counting

Apply this update after the player-development fix.

## Copy and deploy

1. Extract Dugout2Home-game-removal-update.zip.
2. In GitHub Desktop, select Dugout2home → Repository → Show in Explorer.
3. Copy the contents of the extracted folder into the existing repository, replacing matching files and keeping other files.
4. Commit as **Add game removal and CSV coverage check**, then Push origin.
5. If Railway does not start a new deployment, open dugout2home and choose Ctrl + K → Deploy Latest Commit.
6. Keep `npm run prisma:migrate` as the pre-deploy command. Include the new migration `prisma/migrations/202610010001_game_removal/migration.sql` in your commit. No new environment variable or service is required.
7. After Success, refresh with Ctrl + Shift + R.

## Remove a game

Open Recaps → expand the season and tournament/standalone games → open the game → **Remove game** → **Confirm removal**.

The game moves to **Recaps → Removed games / Restore**. It no longer contributes to active game logs, player totals, tournament summaries, practice evidence, or parent email drafts. Evaluations tied to that game are hidden from coach and family views until restored. Player roster entries, family links and unrelated evaluations remain.

To undo, open Removed games and choose **Restore game → Confirm restore**. The original game and player results return without duplication. This is recoverable removal, not permanent erasure.

Uploading the exact same file as a removed game does not silently restore it or create a duplicate. The save confirmation offers a link to review and restore the original removed game.

## CSV coverage check

When choosing a CSV in Scorebook Analyzer, identify whether it covers only one game, cumulative season/tournament totals, or an unknown range. Only a confirmed single-game CSV can enter this analyzer. Cumulative and unknown coverage are rejected before an AI request. This is a coach declaration; it does not independently prove the CSV's scope.

## Recommended combined-source workflow — importer still pending

Use an individual scorebook for the game identity, score, batting and play-by-play evidence. Supplement that same game's pitching and fielding only from a game-specific source, or a trustworthy difference between two cumulative exports.

A cumulative CSV is a season snapshot, not another game. A latest snapshot should replace the previous snapshot for that season rather than be added to already saved game totals. Snapshot totals and summed game totals must remain separate.

For example, cumulative strikeouts increasing from 10 to 14 gives an increment of 4. That increment can be assigned to one game only if exactly one game occurred between exports, both use the same scope, and earlier games were not corrected. With only a single season-total CSV, individual game pitching/fielding totals cannot generally be reconstructed. Pitching innings must be converted to outs before any difference is calculated; .1 and .2 are not decimal fractions.

The pitching/fielding-only CSV importer is NOT included in this update. An actual export is needed to map the columns and sections correctly. Player names can be replaced with initials in the sample.

GameChanger documents its season CSV export here: https://help.gc.com/hc/en-us/articles/360043583651-Exporting-Season-Stats

## Validation

Production build and TypeScript passed. The additive migration applied on disposable local PostgreSQL. All 178 database/handler/server-render checks passed, including 34 new checks for removal/restore permissions, unchanged retained results, exclusion from every relevant view, duplicate upload behavior, stale confirmations and CSV coverage rejection before AI.

Tests mock the AI provider and Next request/router context. Interactive browser clicks and deployment have not been verified for this update. No production game was removed by Codex.
