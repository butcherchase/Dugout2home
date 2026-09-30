# Team workflows update — start here

This update is ready to copy into the same Dugout2home GitHub Desktop repository that deployed the “save button” commit (4d9abd5). It is not deployed yet.

## Install with GitHub Desktop

1. Extract Dugout2Home-team-workflows-update.zip.
2. In GitHub Desktop select Dugout2home, then Repository → Show in Explorer.
3. Copy the CONTENTS of the extracted update folder into that repository folder. Replace matching files. Keep all other repository files. Do not put the update folder inside the repository.
4. Commit with the summary “Seasons, player development and sharing”, then Push origin.
5. In Railway, wait for the new commit to deploy. If no deployment appears, open the dugout2home service, press Ctrl + K and select Deploy Latest Commit.
6. After Success, refresh the app with Ctrl + Shift + R.

Keep the existing Railway DATABASE_URL, APP_URL, OPENAI_API_KEY, and pre-deploy command `npm run prisma:migrate`. No new service, environment variable or email provider is needed.

The ZIP contains complete replacement files for changed/new paths only. Include prisma/migrations/202609300002_team_workflows/migration.sql in your commit. This additive migration keeps current accounts, roster entries, saved games, tournaments and stats. Do not reset the database.

## Where to find each feature

- Initial roster: Scorebook Analyzer → upload → Review and save game → “Create roster players for all unmatched names.” Review every name and skip opponent rows. Click Save game to create the roster and game together. Existing exact-name matches are retained; manual roster entry is still available.
- Seasons: Recaps → “Create a season or tournament” → create Fall 2026, Spring 2027, etc. Choose the season when saving new games or creating tournaments. Existing records are in Unassigned season. Open an existing tournament, select the season and click “Move tournament and all games.” Standalone game pages have an Update season control.
- Collapsible recaps: season folders, tournaments and standalone game lists start collapsed. Use the caret or Collapse all / Expand all. Searching opens matching folders. Tournament detail pages also have a collapsible saved-game list.
- Player breakdowns: Players → select a season → Team hitting, pitching & fielding. Expand each section to see every active player’s results, strengths and focus. Individual profiles retain game-by-game evidence and coach evaluations.
- Parent email: Players → player → Draft parent development email. Select an approved linked parent or enter their email. Review the latest five matched games in the selected season, edit the draft and replace coach placeholders. Confirm the recipient and feedback, then Open email draft. Finish and send in your email app. Copy message is available if your browser cannot open email or truncates a long message. Dugout2Home does not send, store or track delivery of these drafts.
- Practice: check multiple saved games (up to 100), or choose a whole tournament. Select losses only when useful. The comparison shows issues flagged in losses versus wins/ties; the practice plan uses the selected evidence. Season filtering helps find games. Generated plans remain session-only.
- Team logo: a Team Admin opens Team settings → Team logo. Upload PNG, JPG or WebP, preview, and Save logo. Logos are resized and stored in PostgreSQL, so Railway redeploys retain them. The logo appears in the app header and recap images.
- Social sharing: open a saved game or tournament → Create a social recap. Edit the headline, highlight and caption; review the preview. Use Share image & caption on supported devices, or Download recap image and Copy caption, then attach/paste in Facebook, Instagram or your preferred app. Nothing posts automatically.

## Data and behavior to understand

New scorebook analyses request pitching/fielding metrics and specific development observations. Unknown metrics stay blank / Not recorded; recorded zero stays zero. Pitching workload is stored as outs (2.1 innings means 7 outs), not decimal innings. No ERA or fielding percentage is invented from incomplete data.

Older saved games keep their original data and do not automatically gain these new metrics. Re-uploading the exact same file opens its existing record; it does not overwrite it. Do not use a different export merely to populate missing metrics, as that would duplicate game totals. Saved-game editing remains a future feature.

The email draft offers evidence and editable coaching sections. A single game does not prove improvement over time. Coaches add the progress they have observed. Team loss patterns are associations, not proof of why a team lost.

Creating a player does not create a login or grant access. Parent addresses are suggested only for approved accounts linked to that player. Private coach feedback is not automatically published in the family view. Default social captions include team results, not individual player development notes.

## Validation

- Production Next.js build and TypeScript: passed.
- Additive migration applied to a disposable local PostgreSQL database; schema comparison: no differences.
- 97 real database/handler/server-render checks: passed, including existing save-game checks, role/team boundaries, season movement, preservation of older stats, loss comparisons, parent-recipient linkage, pitching/fielding persistence, and logo permissions.
- Tests mock the AI provider and Next request context. They do not certify live extraction accuracy.
- Interactive browser clicks, image rendering/export, external email-client behavior and native social sharing still need a quick check after deployment. Those depend on the browser/device; copy/download fallbacks are included.

The existing `npm run test:saved-games` command now runs both saved-games.cjs and team-workflows.cjs against a migrated disposable LOCAL database. Never run these fixtures against production.
