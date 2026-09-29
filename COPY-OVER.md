# Copy this version into Dugout2Home

The ZIP contains complete source files, not snippets. Your live GitHub repository and Railway deployment have not been changed.

## 1. Copy the files

Extract `Dugout2Home-onboarding.zip`. Copy everything **inside its Dugout2Home folder** into the root of your existing Dugout2home repository and replace matching files. Include the new `app`, `lib`, `prisma/migrations`, `scripts`, and `tests` files, plus the package/configuration files. Do not put the Dugout2Home folder inside the repository as another nested folder. Keep your existing secrets; the ZIP contains only a blank `.env.example`.

Review/commit the files as one change. No manual editing of code snippets is needed.

## 2. Connect PostgreSQL in Railway

This update requires a database for accounts and approvals. Add a PostgreSQL service if your project does not have one, and set the app service’s `DATABASE_URL` to that service’s connection URL (normally `${{Postgres.DATABASE_URL}}`, using your database service’s actual name).

Set these app variables before deploying:

| Variable | Value |
| --- | --- |
| DATABASE_URL | Your Railway PostgreSQL connection |
| APP_URL | `https://dugout2home-production.up.railway.app` (or your actual public app origin) |
| OPENAI_API_KEY | Keep your current key |
| OPENAI_MODEL | Keep your current working model |

Use Node.js 22.13+ and the included pnpm lockfile/packageManager setting. Build command: `npm run build`. Start command: `npm run start`. Add **Pre-deploy command: `npm run prisma:migrate`** so database tables exist before the new app starts. If setting the install command explicitly, use `npx pnpm@11.19.0 install --frozen-lockfile`.

## 3. Choose the database case

**New/empty database:** use the pre-deploy migration command above. It creates all tables and the onboarding additions.

**Database already containing the old Dugout2Home tables:** take a database backup first. Before the first deployment of this upgrade, run `npm run prisma:baseline` once in a terminal with the new dependencies installed and DATABASE_URL connected to that existing database. This command checks that its schema exactly matches the original repo before recording the original tables as already present. Then run `npm run prisma:migrate` (or let the pre-deploy command run it).

Do not use the baseline command for a new database or one that already has migration history. If the guarded baseline reports a mismatch, stop and reconcile the existing schema/history before deploying; do not reset the database. The migrations intentionally preserve existing records.

## 4. Try the flow

Create your account, create Lady Sparks, add players in Team settings, and share the join code. Use a separate parent account to request to join. The parent should see only a waiting message until you approve and link their child. After approval, the parent sees only their linked player and feedback a coach has chosen to share. Your coach account retains the analyzer.

Existing records without passwords require the operator-only password setup described in README.md. Email notifications, self-service password-reset emails, game saving, and tournament persistence are not part of this phase.
