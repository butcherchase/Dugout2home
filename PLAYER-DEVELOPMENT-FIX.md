# Player development observations fix

The older player table read only the new structured development fields. It did not derive observations from saved batting counts or recover pitching evidence already present in older game notes. This update addresses that gap.

## Copy and deploy

Apply on top of the COPPA disclosure update (commit f9b8073).

1. Extract Dugout2Home-player-development-fix.zip.
2. In GitHub Desktop select Dugout2home → Repository → Show in Explorer.
3. Copy the contents of the extracted folder into the existing repository and replace matching files. Keep other files.
4. Commit as **Fix player development observations**, then Push origin.
5. If Railway does not pick up the commit, open dugout2home and press Ctrl + K → Deploy Latest Commit.
6. After Success, refresh the app with Ctrl + Shift + R.

No database migration, new service or new environment variable is needed. Keep the existing Railway settings.

## Recover older games

1. Open Players and select the appropriate season (or All seasons).
2. Under the team hitting/pitching/fielding table, find **Refresh saved game development**.
3. Choose a saved game and click **Build development preview**.
4. Expand each player. Review the source excerpts, pitching and fielding metrics, strengths and development focus. Correct new values where needed. Blank means unknown. Pitching workload uses outs, not decimal innings.
5. Click **Save reviewed development**.
6. Repeat for other older games.

This updates development details on existing player-game rows. It does not duplicate games or change batting totals, scores, dates, seasons, tournaments, or player identities. Previously recorded metrics are locked and retained. Existing observations remain; recovery adds observations and fills missing metrics. A preview must be regenerated if the saved game changes before it is applied.

Hitting observations now derive automatically from saved counts, including older games. Pitching and fielding observations also derive from their recorded counts when available. These are evidence-based summaries and practice suggestions, not scouting grades or diagnoses of mechanics. Parent email drafts use the same observations.

The upload prompt now explicitly checks pitching/fielding sections, substitutions, and pitchers with no batting appearances. It asks for player-specific strengths and focus grounded in scorebook evidence.

## What can be recovered

The app uses the existing saved notes, game events, matched player stats and analysis. For example, a note that explicitly attributes two strikeouts and no walks to a named pitcher can support those pitching figures. Batting strikeouts do not count as pitching strikeouts.

The original scorebook file is not stored. If the earlier analysis omitted a metric completely, recovery cannot recreate it from nothing. It stays unknown. Do not upload a different copy as a second game just to fill fields; that would duplicate totals. Review generated observations against your original scorebook.

## Validation

Production build and TypeScript passed. All 144 real database/handler/server-render checks passed, including the previous regression checks and 33 recovery checks. These cover permissions, source-player matching, preview-only behavior, preservation of existing numbers, stale-preview rejection, unchanged game totals, provider failures, and derived observations.

Tests mock the AI provider and Next request/router context. Live model extraction accuracy and interactive browser preview/save clicks have not been tested for this update. The original missing-observations issue was verified on the live Players page, including pitching evidence in saved notes. No live game records were changed by Codex.
