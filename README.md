# Dugout2Home — onboarding and team access

This is the complete updated source for `butcherchase/Dugout2home`, based on the GitHub main branch downloaded September 29, 2026. Start with **COPY-OVER.md** for the short handoff.

## Included

- Account signup, email/password sign-in, and sign-out.
- Create a team (creator becomes TEAM_ADMIN) or request to join using a private team code.
- Team admin approval, rejection, and removal of access.
- TEAM_ADMIN, COACH, PARENT, and PLAYER roles, stored per team membership.
- Persistent user/team selection, plus switching between approved teams.
- Admin roster creation and explicit parent/child or player/self roster links.
- Server checks on every protected page, API endpoint, and mutation; navigation follows the approved role.
- Parent/player pages fetch only linked players and explicitly shared evaluation notes/scores. Internal evidence is never included in family responses.
- Existing image, PDF, and CSV scorebook analysis. Team perspective and practice age group now come from the approved membership, rather than a fixed team/10U value.

## Permissions

| Capability | Team admin | Coach | Parent | Player |
| --- | --- | --- | --- | --- |
| Score analyzer / practice generation | Yes | Yes | No | No |
| Team roster and internal evaluations | Yes | Yes | No | No |
| Share or hide evaluation feedback | Yes | Yes | No | No |
| Add roster players / approve requests / rotate code | Yes | No | No | No |
| Family development view | Via coach view | Via coach view | Linked children | Own linked player |
| Team data while pending or rejected | No | No | No | No |

Creating a new team does not grant access to another existing team. Parent/player links are confirmed by the admin, never granted from a typed name or email match. A PLAYER approval requires exactly one roster entry; PARENT requires one or more; COACH requires none. Join requests cannot ask for TEAM_ADMIN. Only creation grants that role in this version. To correct an approved role/link, remove that membership’s access, have the person request to join again, and approve with the correct role/links.

## Local setup

Use Node.js 22.13 or later and PostgreSQL 13 or later. Copy `.env.example` to `.env`, then set your database URL, `APP_URL=http://localhost:3000`, and your existing OpenAI settings. Prisma CLI and Next.js both read `.env`.

```sh
npx pnpm@11.19.0 install
npm run prisma:migrate
npm run dev
```

The lockfile records the versions tested. npm scripts work after pnpm installs dependencies. On a fresh database, both migrations run automatically. For a database that already has the old tables, use the upgrade instructions in COPY-OVER.md first.

## First use

1. Create your account and choose Create a team.
2. Enter the team name exactly as it appears in your scorebooks, age group, and season.
3. In Team settings, add your players and share the team code privately.
4. Each coach, parent, or player creates a separate account and submits a join request.
5. Review the person’s identity, choose their role, select the correct roster links, and approve.
6. Parents and players open My development. Coaches open the team dashboard and analyzer.

The approval queue is in the app; there are no email notifications yet. A pending person can refresh My teams after approval. Multiple children can be linked to one parent.

## Database upgrades

`202609290001_baseline` represents the original repository schema. `202609290002_onboarding` is the additive upgrade, with role conversion inside a transaction:

- OWNER and HEAD_COACH become TEAM_ADMIN.
- ASSISTANT_COACH becomes COACH.
- Existing memberships remain approved; all new requests default to pending.
- Existing game, player, tournament, and practice rows are preserved.
- Existing evaluations default to private, and existing family memberships receive no automatic player links.
- Existing users have no password hash, since the original schema had no authentication. They cannot claim those accounts through public signup. A trusted operator can provision a password after verifying the owner using `npm run account:set-password -- person@example.com` in a terminal with DATABASE_URL set. Password input is hidden and existing sessions are invalidated. The same tool supports manual account recovery.

`prisma/legacy-schema.prisma` is an archival baseline used only by the guarded baseline command. Continue editing `prisma/schema.prisma` for future development.

## Authentication details

Passwords use salted scrypt hashes. Session cookies contain random tokens; only SHA-256 token hashes are stored in PostgreSQL. Cookies are HttpOnly, SameSite=Lax, and Secure with a `__Host-` prefix in production; sessions expire after seven days. Logout deletes the server session. Permissions are fetched from the database on each request, so removing access does not wait for a cookie to expire. Durable rate counters limit signup/sign-in, team creation, and code guesses. Keep Railway’s trusted proxy headers configured correctly for IP throttling; per-email limits also apply.

Next.js Server Actions provide same-origin checks, and the two AI API routes independently check APP_URL. All authorization is also enforced in the server functions, following the [Next.js authentication guidance](https://nextjs.org/docs/app/guides/authentication). There is no role or team authority in localStorage or submitted hidden fields. Use HTTPS for production cookies.

There is no automated email verification, email password reset, MFA, or invitation email in this phase. Admin approval verifies team membership; it is not proof of email ownership. Session cleanup can periodically delete expired Session rows, and stale RateLimit rows can be removed after their window expires.

## Saved games and tournaments

The dashboard now shows the Scorebook Analyzer feeding Player Development, Practice Planner, and Game & Tournament Recaps. After analysis, review the game details and click **Save game**. Match each scorebook row to a roster player, explicitly create a new player, or skip it. Correct extracted player totals before saving. Only matched/created rows count toward player totals.

Save into an existing tournament, create a tournament during saving, or leave the game standalone. Recaps is now a searchable game log with saved game detail pages and tournament summaries. Existing games can be assigned to another tournament from their detail page. Practice loads the latest saved game by default and can use a selected game or tournament. Player Development includes actual game totals and game-by-game evidence; recruiting/D1 metrics remain a future phase.

The original source file is not stored. The reviewed structured analysis is stored in PostgreSQL. A team-scoped SHA-256 source hash prevents the same file from being saved twice, including simultaneous retries. A different export/photo of the same game is a different file and is not automatically deduplicated. Saving a repeat of the same file opens the original saved record rather than overwriting its stats. Saved-game editing/deletion is not included in this phase; review before saving.

Family access remains limited to approved roster links and explicitly shared evaluation feedback. Saving an analysis does not automatically publish its game notes to parents/players or invent development scores. Generated practice plans are still displayed for the current visit; their source games and priorities remain saved and can regenerate the plan.

Previously analyzed games from before this update were never stored; re-upload those scorebooks and save them once. See GAME-SAVING-UPDATE.md for copy-over instructions.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

For end-to-end tests, create a disposable LOCAL PostgreSQL database, migrate it, and start a production build at port 3100 with `DATABASE_URL` pointing to that database and `APP_URL=http://localhost:3100`. Leave OPENAI_API_KEY unset for this particular integration suite. Set `D2H_TEST_URL=http://localhost:3100` in the test terminal, then run `npm run test:integration`. The suite creates named test users/teams and removes only those rows when done. It refuses non-local hosts.

`npm run test:analyzer` uses the same disposable DATABASE_URL, starts a separate local app on port 3102 and a mock AI service on 3101, and verifies all upload branches without calling OpenAI. Ports 3101–3102 must be free.

See VALIDATION.md for the checks completed for this handoff. Live Railway deployment and real AI extraction accuracy were not tested.

## Saved-game verification

With DATABASE_URL set to a migrated disposable local PostgreSQL database, run `npm run test:saved-games`. It exercises the real route handlers, server pages, authorization queries, and database transactions. Only Next request-context helpers (cookies and cache invalidation) and the AI provider are mocked. It also temporarily creates a database trigger to verify transaction rollback; run this only on an isolated test database, without concurrent test suites. The script removes its test accounts/teams and trigger. A live app server is not required.
