ALTER TABLE "Team" ADD COLUMN "logoData" TEXT;
CREATE TABLE "Season" (
 "id" TEXT NOT NULL, "teamId" TEXT NOT NULL, "name" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "Season_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "Season_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Season_teamId_name_key" ON "Season"("teamId", "name");
ALTER TABLE "Tournament" ADD COLUMN "seasonId" TEXT;
ALTER TABLE "Game" ADD COLUMN "seasonId" TEXT;
ALTER TABLE "PlayerGameLine" ADD COLUMN "details" JSONB;
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Game" ADD CONSTRAINT "Game_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Existing records remain intact in the Unassigned season folder.
