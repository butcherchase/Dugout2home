# Under-13 disclosure toggle

Adds **Team settings → COPPA / Children under 13** with the label:

“This team will store information about children under 13 in Dugout2Home.”

An approved Team Admin can turn it on or off and click **Save disclosure**. The saved choice, last updating account ID and server timestamp are stored in PostgreSQL. Existing teams start as **Not reviewed**.

## Copy and deploy

Apply this on top of the seasons / player development / sharing (“major update”) release.

1. Extract Dugout2Home-under13-disclosure-update.zip.
2. In GitHub Desktop select Dugout2home → Repository → Show in Explorer.
3. Copy the contents of the extracted folder into the existing repository. Replace matching files and keep all other files.
4. Commit as **Add under-13 disclosure toggle**, then **Push origin**.
5. If Railway does not start a deployment, open dugout2home and use **Ctrl + K → Deploy Latest Commit**.
6. After Success, refresh the app, open Team settings, choose the disclosure and click Save disclosure.

Keep `npm run prisma:migrate` as the Railway pre-deploy command. No new environment variables are required. Include `prisma/migrations/202609300003_under13_disclosure/migration.sql`; it adds three nullable fields and preserves existing data.

## Scope

This records a team disclosure. It is not parental consent, age verification or certification of COPPA compliance. Turning it off does not establish that COPPA is inapplicable. Where COPPA applies, notice, verifiable parental consent and other requirements must be handled separately. The UI links to [FTC guidance](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-six-step-compliance-plan-your-business).

## Validation

Production build and TypeScript passed. The migration applied to disposable local PostgreSQL with no schema differences. All 111 database/handler/server-render checks passed, including 14 new disclosure checks for permissions, persistence, validation, audit metadata and displayed wording. Tests mock Next request/router context and the AI provider. Interactive browser clicks were not tested. This update has not been deployed by Codex.
