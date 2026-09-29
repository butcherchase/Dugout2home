"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireAdmin, requireCoach, startSession, endSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { allowAttempt } from "@/lib/rate-limit";
import { validPlayerLinks } from "@/lib/permissions";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
function fail(path: string, code: string): never { redirect(`${path}?message=${code}`); }
const credentials = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(12).max(128) });

async function authLimit(email: string) {
  const h = await headers();
  // Configure the trusted Railway proxy; never use this IP limit instead of the email limit.
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const account = await allowAttempt(`auth:email:${email.toLowerCase()}`, 15);
  const source = await allowAttempt(`auth:ip:${ip}`, 100);
  return account && source;
}

export async function signup(form: FormData) {
  const parsed = credentials.extend({ name: z.string().min(1).max(100) }).safeParse({
    name: text(form, "name"), email: text(form, "email"), password: form.get("password")
  });
  if (!parsed.success) fail("/signup", "invalid");
  const input = parsed.data;
  if (!await authLimit(input.email)) fail("/signup", "slow");
  const passwordHash = await hashPassword(input.password);
  let id: string;
  try {
    const user = await db.user.create({ data: { name: input.name, email: input.email, passwordHash } });
    id = user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") fail("/signup", "register");
    throw e;
  }
  await startSession(id);
  redirect("/onboarding");
}

export async function login(form: FormData) {
  const parsed = credentials.safeParse({ email: text(form, "email"), password: form.get("password") });
  if (!parsed.success) fail("/login", "credentials");
  if (!await authLimit(parsed.data.email)) fail("/login", "slow");
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!await verifyPassword(parsed.data.password, user?.passwordHash ?? null) || !user) fail("/login", "credentials");
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function createTeam(form: FormData) {
  const user = await requireUser();
  const parsed = z.object({ name: z.string().min(2).max(100), ageGroup: z.string().min(1).max(30), season: z.string().min(1).max(50) }).safeParse({
    name: text(form, "name"), ageGroup: text(form, "ageGroup"), season: text(form, "season")
  });
  if (!parsed.success) fail("/onboarding", "invalid");
  if (!await allowAttempt(`create-team:${user.id}`, 5)) fail("/onboarding", "slow");
  await db.$transaction(async tx => {
    const team = await tx.team.create({ data: { ...parsed.data, joinCode: randomBytes(12).toString("hex"), members: {
      create: { userId: user.id, role: "TEAM_ADMIN", status: "APPROVED" }
    } } });
    await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } });
  });
  redirect("/team");
}

export async function joinTeam(form: FormData) {
  const user = await requireUser();
  const parsed = z.object({ code: z.string().min(8).max(100), role: z.enum(["COACH", "PARENT", "PLAYER"]), playerRequest: z.string().max(300) }).safeParse({
    code: text(form, "code").toLowerCase(), role: text(form, "role"), playerRequest: text(form, "playerRequest")
  });
  if (!parsed.success) fail("/onboarding", "invalid");
  if (parsed.data.role !== "COACH" && !parsed.data.playerRequest) fail("/onboarding", "invalid");
  if (!await allowAttempt(`join:${user.id}`, 20)) fail("/onboarding", "slow");
  const team = await db.team.findUnique({ where: { joinCode: parsed.data.code }, select: { id: true } });
  if (!team) fail("/onboarding", "code");
  await db.$transaction(async tx => {
    // Never overwrite an existing approved role with client-supplied data.
    await tx.teamMember.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      create: { userId: user.id, teamId: team.id, role: parsed.data.role, status: "PENDING", playerRequest: parsed.data.playerRequest },
      update: {}
    });
    await tx.teamMember.updateMany({ where: { userId: user.id, teamId: team.id, status: "REJECTED" },
      data: { status: "PENDING", role: parsed.data.role, playerRequest: parsed.data.playerRequest } });
    await tx.user.update({ where: { id: user.id }, data: { activeTeamId: team.id } });
  });
  redirect("/onboarding");
}

export async function selectTeam(form: FormData) {
  const user = await requireUser();
  const member = await db.teamMember.findFirst({ where: { id: text(form, "memberId"), userId: user.id } });
  if (!member) fail("/onboarding", "stale");
  await db.user.update({ where: { id: user.id }, data: { activeTeamId: member.teamId } });
  redirect("/dashboard");
}

export async function addPlayer(form: FormData) {
  const admin = await requireAdmin();
  const parsed = z.object({ firstName: z.string().min(1).max(60), lastName: z.string().max(60), jersey: z.string().max(10) }).safeParse({
    firstName: text(form, "firstName"), lastName: text(form, "lastName"), jersey: text(form, "jersey")
  });
  if (!parsed.success) fail("/team", "invalid");
  await db.player.create({ data: { ...parsed.data, teamId: admin.teamId, positions: [] } });
  revalidatePath("/team");
  redirect("/team?message=saved");
}

export async function reviewMember(form: FormData) {
  const admin = await requireAdmin();
  const memberId = text(form, "memberId");
  const decision = text(form, "decision");
  if (!["approve", "reject", "revoke"].includes(decision)) fail("/team", "invalid");
  const role = z.enum(["COACH", "PARENT", "PLAYER"]).safeParse(text(form, "role"));
  const playerIds = [...new Set(form.getAll("playerIds").map(String))];
  if (decision === "approve" && (!role.success || !validPlayerLinks(role.data, playerIds))) fail("/team", "links");
  // Lock the target row: concurrent approval/rejection must never leave stale player links.
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "TeamMember" WHERE "id" = ${memberId} FOR UPDATE`;
    const member = await tx.teamMember.findFirst({ where: { id: memberId, teamId: admin.teamId, role: { not: "TEAM_ADMIN" } } });
    if (!member || (decision === "revoke" ? member.status !== "APPROVED" : member.status !== "PENDING")) return "stale";
    if (decision === "approve" && role.success) {
      const count = await tx.player.count({ where: { id: { in: playerIds }, teamId: admin.teamId, active: true } });
      if (count !== playerIds.length) return "links";
      await tx.playerAccess.deleteMany({ where: { memberId } });
      await tx.teamMember.update({ where: { id: memberId }, data: { role: role.data, status: "APPROVED" } });
      if (playerIds.length) await tx.playerAccess.createMany({ data: playerIds.map(playerId => ({ memberId, playerId })) });
    } else {
      await tx.playerAccess.deleteMany({ where: { memberId } });
      await tx.teamMember.update({ where: { id: memberId }, data: { status: "REJECTED" } });
    }
    return "saved";
  });
  revalidatePath("/team");
  redirect(`/team?message=${result}`);
}

export async function rotateCode() {
  const admin = await requireAdmin();
  await db.team.update({ where: { id: admin.teamId }, data: { joinCode: randomBytes(12).toString("hex") } });
  revalidatePath("/team");
  redirect("/team?message=saved");
}

export async function shareEvaluation(form: FormData) {
  const member = await requireCoach();
  await db.playerEvaluation.updateMany({
    where: { id: text(form, "evaluationId"), player: { teamId: member.teamId } },
    data: { sharedWithFamily: text(form, "shared") === "true" }
  });
  revalidatePath("/players");
  revalidatePath("/my-player");
}
