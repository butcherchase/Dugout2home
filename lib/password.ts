import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  // Perform the same work for an unknown account to reduce account enumeration.
  const [, salt, expected] = (stored ?? "scrypt$00000000000000000000000000000000$" + "0".repeat(128)).split("$");
  const actual = await derive(password, salt);
  const target = Buffer.from(expected, "hex");
  return actual.length === target.length && timingSafeEqual(actual, target) && stored !== null;
}

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
