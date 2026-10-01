-- NULL means the team admin has not reviewed this disclosure yet.
-- This is a team disclosure, not a parental-consent record.
ALTER TABLE "Team"
  ADD COLUMN "containsUnder13Data" BOOLEAN,
  ADD COLUMN "under13DisclosureUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "under13DisclosureUpdatedBy" TEXT;
