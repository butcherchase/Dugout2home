# Game saving update — start here

This update adds dashboard arrows, a Save game button, a searchable saved-game log, tournament creation/assignment/recaps, saved player results, and game-based practice priorities.

## Copy it into GitHub Desktop

1. Extract **Dugout2Home-game-saving-update.zip**.
2. In GitHub Desktop, select Dugout2home, then **Repository → Show in Explorer**.
3. Open the extracted update folder. Copy **everything inside it** (app, lib, prisma, tests, package.json, and the documentation) into the repository folder. Replace matching files. Do not put another Dugout2Home folder inside the repository.
4. Back in GitHub Desktop, commit with the summary **Add saved games and tournament recaps**, then **Push origin**.
5. Railway should build and deploy. Keep your current DATABASE_URL and APP_URL values. Keep **Pre-deploy Command: `npm run prisma:migrate`**. No new database service or variable changes are needed.

The ZIP contains full replacement files for only the changed/new paths. Keep the rest of your existing repository. The new migration adds an optional file hash and indexes; it does not reset or delete your existing users, teams, players, or games. Include the new `prisma/migrations/202609300001_saved_games/migration.sql` file when you copy and commit.

## Use the new flow

1. Open Scorebook Analyzer and upload your scorebook.
2. Review the **Review and save game** section: opponent, date, final score, and optional tournament.
3. For each extracted player, confirm the roster match. You can create a new roster player or skip a row (for example an opponent). Correct counts before saving.
4. Click **Save game**. The confirmation links to the saved game, player totals, and practice planning.
5. Open Recaps to search by opponent, game date, or tournament. You can also create a tournament there, then open an existing game and assign it to that tournament.

Previously analyzed games were not saved by the older version. Re-upload those files and save them once. Re-saving the exact same file will open its existing saved game rather than double-count the stats. Different photos/exports of one game are not automatically recognized as duplicates, so use one file per game.

Player totals and game notes now update in coach views. Family feedback stays under the existing coach-sharing rules. The more detailed D1 development profile can be refined next. Generated practice plans are not archived yet; saved game priorities remain available to generate another plan.

## Verification completed

- Production build and Prisma schema validation passed.
- New migration applied to a disposable local PostgreSQL database; no schema drift detected.
- 53 checks passed using real authorization/database queries, transactions, save handlers, and rendered server pages. These include concurrent retry deduplication; rollback of game, tournament, and newly created player together after a simulated write failure; cross-team restrictions; player totals; game/date search; tournament assignment; family privacy; and all three upload branches.
- AI calls were mocked; no live API calls or production data changes were made.

The local Next.js server launch was rejected by automatic approval review because sandbox approvals are disabled. Browser policy also blocked opening a local HTML snapshot. Full interactive browser testing and visual inspection of this update were therefore not completed; the build, server-page rendering, and real-database checks passed.
