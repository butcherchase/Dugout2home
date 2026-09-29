// Operator-only recovery tool. Never expose this through an app route.
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !process.stdin.isTTY) throw new Error("Run in an interactive terminal: npm run account:set-password -- person@example.com");
  const db = new PrismaClient();
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, done) { if (!muted) process.stdout.write(chunk); done(); } });
  const input = createInterface({ input: process.stdin, output, terminal: true });
  try {
    const users = await db.user.findMany({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (users.length !== 1) throw new Error("Expected exactly one existing account. Verify the email and account owner first.");
    process.stdout.write("After verifying the account owner, enter a new password (hidden, 12–128 characters): ");
    muted = true;
    const password = await input.question("");
    process.stdout.write("\nConfirm password (hidden): ");
    const confirmation = await input.question("");
    process.stdout.write("\n");
    if (password !== confirmation || password.length < 12 || password.length > 128) throw new Error("Passwords must match and contain 12–128 characters.");
    const passwordHash = await hashPassword(password);
    await db.$transaction([
      db.user.update({ where: { id: users[0].id }, data: { passwordHash, email } }),
      db.session.deleteMany({ where: { userId: users[0].id } })
    ]);
    process.stdout.write("Password updated. Previous sessions are signed out.\n");
  } finally { muted = false; input.close(); await db.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
