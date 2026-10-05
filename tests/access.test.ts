import test from "node:test";
import assert from "node:assert/strict";
import { computeAccess, evaluateMember, inactiveMessage } from "../lib/access";

const ROLE = "role-huh";

test("evaluateMember - not in the Discord server", () => {
  assert.deepEqual(evaluateMember(null, ROLE), { discordOk: false, discordReason: "not_in_guild" });
});

test("evaluateMember - in server but without HUH? role", () => {
  assert.deepEqual(evaluateMember({ roles: ["other"] }, ROLE), { discordOk: false, discordReason: "missing_role" });
  assert.deepEqual(evaluateMember({ roles: [] }, ROLE), { discordOk: false, discordReason: "missing_role" });
  assert.deepEqual(evaluateMember({}, ROLE), { discordOk: false, discordReason: "missing_role" });
});

test("evaluateMember - in server AND has HUH? role", () => {
  assert.deepEqual(evaluateMember({ roles: ["x", ROLE] }, ROLE), { discordOk: true, discordReason: null });
});

test("computeAccess - needs BOTH conditions", () => {
  // both ok
  assert.deepEqual(computeAccess({ manualActive: true, discordOk: true }), { active: true, reason: null });
  // admin switched off, discord ok
  assert.deepEqual(computeAccess({ manualActive: false, discordOk: true }), { active: false, reason: "manual" });
  // admin on, but kicked from server
  assert.deepEqual(
    computeAccess({ manualActive: true, discordOk: false, discordReason: "not_in_guild" }),
    { active: false, reason: "not_in_guild" }
  );
  // admin on, but HUH? role removed
  assert.deepEqual(
    computeAccess({ manualActive: true, discordOk: false, discordReason: "missing_role" }),
    { active: false, reason: "missing_role" }
  );
  // both bad → manual wins as the reason, still inactive
  assert.equal(computeAccess({ manualActive: false, discordOk: false, discordReason: "missing_role" }).active, false);
});

test("computeAccess - legacy users without fields stay active until first Discord check", () => {
  assert.deepEqual(computeAccess({}), { active: true, reason: null });
});

test("computeAccess - becomes Active again automatically when role is restored", () => {
  const kicked = computeAccess({ manualActive: true, discordOk: false, discordReason: "not_in_guild" });
  assert.equal(kicked.active, false);
  const back = computeAccess({ manualActive: true, discordOk: true, discordReason: null });
  assert.equal(back.active, true);
});

test("inactiveMessage - Thai notice per reason", () => {
  assert.match(inactiveMessage("missing_role"), /HUH\?/);
  assert.match(inactiveMessage("not_in_guild"), /เซิร์ฟเวอร์/);
  assert.match(inactiveMessage(null), /Inactive/);
});
