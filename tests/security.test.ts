import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, digest } from "../lib/password";
import { isCoach, validPlayerLinks } from "../lib/permissions";

test("password hashes are salted, verify correctly, and reject incorrect or missing accounts", async () => {
  const password = "Example-password-123!";
  const [a, b] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword(password, a), true);
  assert.equal(await verifyPassword("wrong-password", a), false);
  assert.equal(await verifyPassword(password, null), false);
  assert.equal(digest("token").length, 64);
});

test("family and unknown roles cannot use coach tools", () => {
  assert.equal(isCoach("TEAM_ADMIN"), true);
  assert.equal(isCoach("COACH"), true);
  for (const role of ["PARENT", "PLAYER", "OWNER", "", "admin"]) assert.equal(isCoach(role), false);
});

test("approval requires an appropriate number of player links", () => {
  assert.equal(validPlayerLinks("PLAYER", []), false);
  assert.equal(validPlayerLinks("PLAYER", ["a"]), true);
  assert.equal(validPlayerLinks("PLAYER", ["a", "b"]), false);
  assert.equal(validPlayerLinks("PARENT", []), false);
  assert.equal(validPlayerLinks("PARENT", ["a", "b"]), true);
  assert.equal(validPlayerLinks("COACH", []), true);
  assert.equal(validPlayerLinks("COACH", ["a"]), false);
  assert.equal(validPlayerLinks("TEAM_ADMIN", []), false);
});
