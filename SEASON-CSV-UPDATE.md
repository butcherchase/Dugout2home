# GameChanger season CSV update

Includes cumulative CSV importing and the previous remove/restore game update.

## Install
1. Extract this ZIP.
2. Copy its app, lib, prisma and tests folders into your existing Dugout2home repository. Replace matching files. Do not delete other repository files.
3. In GitHub Desktop, commit as "Season CSV import" and push.
4. In Railway choose the dugout2home service, Ctrl+K, Deploy Latest Commit. The existing pre-deploy migration command adds a nullable Season.csvSnapshot column (and removed-game fields if not yet installed).

## Use
Go to Players > Import GameChanger season CSV. Choose a season and describe the export coverage (date and any GameChanger filters). Upload ONE of your three identical files. Pitching and fielding are selected by default; batting is optional. Preview, review each roster match, check the confirmation and save.

The season and roster must already exist. Ambiguous/unmatched players default to Skip; choose their correct roster entry. No new players or games are created by this import.

Player Development shows the imported cumulative statistics and count-based feedback separately from saved-game results. Selecting a season filters the snapshots. New imports replace the entire prior snapshot for that season, including category choices and matched players. They never add totals together. One snapshot is kept per season; use consistent export filters for comparable updates. A tournament-only export can be labeled in coverage, but it still replaces that season's prior snapshot.

Your original scorebook games, recaps and per-game history remain unchanged. CSV imports do not backfill individual games or infer which game produced a statistic. Practice plans and parent email drafts still use saved-game evidence. Removing a game does not subtract it from a cumulative CSV snapshot; export corrected totals and reimport when needed. Feedback is private to coaches and is descriptive, not a recruiting grade or longitudinal improvement claim.

Core imported counts: batting GP/PA/AB/H/BB/SO/R/RBI; pitching GP/IP/H/BB/SO/R/ER; fielding PO/A/E/TC. Other advanced CSV columns are not displayed in this version. Innings notation is converted to outs for storage and back to innings for display. Missing counts stay unknown.

## Validation
Production build and TypeScript passed. All 200 local database/route/render checks passed, including access controls, season ownership, roster ownership, stale previews, replacement, category selection, season filtering and scorebook/removal regression checks. Migration applied successfully to a local PostgreSQL database. The supplied combined CSV was checked with the actual parser. No production data was imported or modified, and live interactive browser testing was not performed.
