import "server-only";
import { db } from "@/lib/db";
import { digest } from "@/lib/password";

// Durable, atomic counters work across Railway replicas. No in-memory auth limits.
export async function allowAttempt(key: string, limit: number, minutes = 15) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - minutes * 60_000);
  const hashed = digest(key);
  const rows = await db.$queryRaw<{ attempts: number }[]>`
    INSERT INTO "RateLimit" ("key", "attempts", "windowStart") VALUES (${hashed}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."attempts" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "attempts"`;
  return rows[0].attempts <= limit;
}
