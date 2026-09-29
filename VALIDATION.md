# Validation — September 29, 2026

Completed against a local production Next.js build and a disposable PostgreSQL 18.4 instance:

- Production build and TypeScript checks passed.
- Prisma schema validation passed.
- Fresh database: both migrations applied successfully.
- Legacy-data fixture: original users/roles, memberships, a player, an evaluation, and a game survived the upgrade. Old roles mapped correctly, active teams were assigned, invite codes backfilled, and evaluation sharing defaulted to false.
- Guarded baseline tested: accepted an exact legacy schema, upgraded it successfully, and refused a repeated baseline after the schema changed.
- Prisma migration/schema drift check: no difference detected.
- Three unit tests passed for password hashing/verification and role/player-link rules.
- 54 HTTP integration checks passed, exercising real server actions, session cookies, and database records: guest protection, signup/login, team creation, pending joins, admin approval, forbidden admin-role requests, required roster links, cross-team link rejection, coach/family page and API restrictions, private-note filtering from the full HTML/RSC payload, sharing/unsharing, forged admin action denial, invite rotation, revocation, logout, and expiration.
- Local AI mock tests passed for CSV, PDF, and PNG. All used the stored team name, preserved structured output, and preserved the PDF data URL format. Practice used the stored age group instead of a submitted override. Unsupported and oversized uploads were rejected before AI calls.
- Signup page visually inspected in the in-app browser.

Not performed: production deployment, production database migration, live AI requests/extraction quality, email delivery (not implemented), or a full mobile-device matrix.

Tested package versions are recorded in pnpm-lock.yaml. Test data and local test database binaries are excluded from the deliverable.
