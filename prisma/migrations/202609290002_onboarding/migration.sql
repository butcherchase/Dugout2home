BEGIN;
-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
CREATE TYPE "UserRole_new" AS ENUM ('TEAM_ADMIN', 'COACH', 'PARENT', 'PLAYER');
ALTER TABLE "TeamMember" ALTER COLUMN "role" TYPE "UserRole_new" USING (
  CASE "role"::text
    WHEN 'OWNER' THEN 'TEAM_ADMIN'
    WHEN 'HEAD_COACH' THEN 'TEAM_ADMIN'
    WHEN 'ASSISTANT_COACH' THEN 'COACH'
    ELSE "role"::text
  END::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeTeamId" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "joinCode" TEXT;
UPDATE "Team" SET "joinCode" = gen_random_uuid()::text;
ALTER TABLE "Team" ALTER COLUMN "joinCode" SET NOT NULL;

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "playerRequest" TEXT,
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING';

-- Existing memberships retain access; newly requested memberships default to pending.
UPDATE "TeamMember" SET "status" = 'APPROVED';
UPDATE "User" u SET "activeTeamId" = (
  SELECT m."teamId" FROM "TeamMember" m WHERE m."userId" = u."id" ORDER BY m."createdAt", m."id" LIMIT 1
);

-- AlterTable
ALTER TABLE "PlayerEvaluation" ADD COLUMN     "sharedWithFamily" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("tokenHash")
);

-- CreateTable
CREATE TABLE "PlayerAccess" (
    "memberId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "PlayerAccess_pkey" PRIMARY KEY ("memberId","playerId")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "PlayerAccess_playerId_idx" ON "PlayerAccess"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_joinCode_key" ON "Team"("joinCode");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_status_idx" ON "TeamMember"("teamId", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAccess" ADD CONSTRAINT "PlayerAccess_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerAccess" ADD CONSTRAINT "PlayerAccess_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
