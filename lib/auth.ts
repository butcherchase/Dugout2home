import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { digest } from "@/lib/password";
import { isCoach } from "@/lib/permissions";

const cookieName = process.env.NODE_ENV === "production" ? "__Host-d2h-session" : "d2h-session";

export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { select: { id: true, name: true, email: true, activeTeamId: true } } }
  });
  return session && session.expiresAt > new Date() ? session.user : null;
}

export async function startSession(userId: string) {
  await endSession();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { tokenHash: digest(token), userId, expiresAt } });
  (await cookies()).set(cookieName, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(cookieName);
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function currentMembership() {
  const user = await currentUser();
  if (!user?.activeTeamId) return null;
  return db.teamMember.findUnique({
    where: { userId_teamId: { userId: user.id, teamId: user.activeTeamId } },
    include: { team: true }
  });
}

export async function requireMember() {
  await requireUser();
  const member = await currentMembership();
  if (!member || member.status !== "APPROVED") redirect("/onboarding");
  return member;
}

export async function requireCoach() {
  const member = await requireMember();
  if (!isCoach(member.role)) redirect("/my-player");
  return member;
}

export async function requireAdmin() {
  const member = await requireMember();
  if (member.role !== "TEAM_ADMIN") redirect("/dashboard");
  return member;
}

// API endpoints return JSON status codes instead of HTML login redirects.
export async function coachApiAccess(request: Request) {
  const user = await currentUser();
  if (!user) return { error: "Please sign in.", status: 401 } as const;
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL;
  if (!expected || origin !== new URL(expected).origin) return { error: "Invalid request origin.", status: 403 } as const;
  const member = await currentMembership();
  if (!member || member.status !== "APPROVED" || !isCoach(member.role)) {
    return { error: "Approved coach access is required.", status: 403 } as const;
  }
  return { member };
}
