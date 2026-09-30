ALTER TABLE "Game" ADD COLUMN "sourceHash" TEXT;
CREATE UNIQUE INDEX "Game_teamId_sourceHash_key" ON "Game"("teamId", "sourceHash");
CREATE INDEX "Game_teamId_playedAt_idx" ON "Game"("teamId", "playedAt");
