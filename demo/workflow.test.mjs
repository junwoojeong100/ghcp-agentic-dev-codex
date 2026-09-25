import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";
import { paths, RUNS, ALLOWED, snapshot, digest, changes, checkScope, copilotArgs, prepare, approvePlan, implement, verify, review, decide, assertVerified } from "./workflow.mjs";

const hash = (text) => createHash("sha256").update(text).digest("hex");

async function fixture(t) {
  const name = `unit-${randomUUID().slice(0, 12)}`;
  const p = paths(name);
  t.after(async () => {
    assert.equal(p.run.startsWith(join(RUNS, "unit-")), true);
    await fs.rm(p.run, { recursive: true, force: true });
  });
  const state = await prepare(name);
  return { name, p, state };
}

async function plannedFixture(t) {
  const f = await fixture(t);
  const content = "UNIT TEST FIXTURE: no Copilot was invoked.\n";
  await fs.writeFile(join(f.p.workspace, "handoff/01-plan.md"), content);
  await fs.writeFile(join(f.p.evidence, "01-plan.md"), content);
  f.state.planHash = hash(content);
  f.state.phase = "planned";
  return f;
}

test("run names cannot escape the dedicated run directory", () => {
  for (const name of ["", "..", "../demo", "/tmp/demo", "UPPER", "a/b", "a".repeat(49)]) {
    assert.throws(() => paths(name), /Run name/);
  }
  assert.equal(paths("stage-1").run, join(RUNS, "stage-1"));
});

test("read roles have no editing, shell or subagent tools", () => {
  for (const role of ["plan", "review"]) {
    const args = copilotArgs(role, "/demo/workspace", "fixture");
    assert.deepEqual(args.slice(args.indexOf("--available-tools") + 1, args.indexOf("--prompt")), ["view", "glob", "grep"]);
    assert.equal(args.includes("--allow-all-tools"), false);
    assert.equal(args.includes("--allow-all-paths"), false);
    assert.equal(args.includes("--allow-tool"), false);
  }
});

test("implementation grants writes only to the explicit product-change files", () => {
  const args = copilotArgs("implement", "/demo/workspace", "fixture");
  const grants = args.filter((_, index) => args[index - 1] === "--allow-tool");
  assert.deepEqual(grants, ALLOWED.map((path) => `write(/demo/workspace/${path})`));
  assert.equal(args.includes("bash"), false);
  assert.equal(args.includes("task"), false);
  assert.equal(args.includes("--yolo"), false);
  assert.equal(args.includes("apply_patch"), true);
});

test("scope checks detect additions, deletions and protected-file changes", () => {
  const base = Object.fromEntries([...ALLOWED, "request.md"].map((path) => [path, "a"]));
  assert.deepEqual(checkScope(base, { ...base, "src/refunds.mjs": "b" }), ["src/refunds.mjs"]);
  assert.throws(() => checkScope(base, { ...base, "request.md": "b" }), /Out-of-scope/);
  assert.throws(() => checkScope(base, { ...base, "new-file": "b" }), /Out-of-scope/);
  const deleted = { ...base };
  delete deleted["README.md"];
  assert.throws(() => checkScope(base, deleted), /must not be deleted/);
  assert.throws(() => checkScope(base, base, true), /must update source/);
  assert.deepEqual(changes(base, base), []);
  assert.equal(digest(base), digest(Object.fromEntries(Object.entries(base).reverse())));
});

test("prepare refuses to overwrite an existing run", async (t) => {
  const { name, p, state } = await fixture(t);
  await assert.rejects(prepare(name), /already exists/);
  assert.equal(digest(await snapshot(p.workspace)), state.baselineDigest);
});

test("approval, implementation, verification, review and decisions cannot skip gates", async (t) => {
  const { p, state } = await fixture(t);
  await assert.rejects(approvePlan(p, state, "test"), /generated plan/);
  await assert.rejects(implement(p, state), /explicit plan approval/);
  await assert.rejects(verify(p, state), /requires an implementation/);
  await assert.rejects(review(p, state), /successful current verification/);
  await assert.rejects(decide(p, state, { by: "test", decision: "hold", reason: "test" }), /fresh review/);
});

test("plan approval is explicit and bound to the baseline", async (t) => {
  const { p, state } = await plannedFixture(t);
  await assert.rejects(approvePlan(p, state), /--by is required/);
  await fs.appendFile(join(p.workspace, "src/refunds.mjs"), "\n");
  await assert.rejects(approvePlan(p, state, "test"), /Workspace changed/);
});

test("edited plan cannot be approved", async (t) => {
  const { p, state } = await plannedFixture(t);
  await fs.appendFile(join(p.workspace, "handoff/01-plan.md"), "changed");
  await assert.rejects(approvePlan(p, state, "test"), /Plan changed/);
});

test("tampered approval blocks implementation before any model call", async (t) => {
  const { p, state } = await plannedFixture(t);
  await approvePlan(p, state, "unit-test-not-a-real-person");
  await fs.appendFile(join(p.workspace, "handoff/plan-approval.json"), "\n");
  await assert.rejects(implement(p, state), /approval was modified/);
});

test("recorded replay cannot receive a new live approval", async (t) => {
  const { p, state } = await plannedFixture(t);
  state.mode = "recorded-replay";
  await assert.rejects(approvePlan(p, state, "test"), /Recorded replay/);
  await assert.rejects(implement(p, state), /Recorded replay/);
  await assert.rejects(review(p, state), /Recorded replay/);
});

test("source edits after a recorded verification invalidate it", async (t) => {
  const { p, state } = await fixture(t);
  const record = JSON.stringify({
    success: true, checks: [{ exitCode: 0 }], sourceDigest: state.baselineDigest,
  });
  state.verificationHash = hash(record);
  await fs.writeFile(join(p.evidence, "03-verification.json"), record);
  await fs.writeFile(join(p.workspace, "handoff/03-verification.json"), record);
  await fs.appendFile(join(p.workspace, "src/refunds.mjs"), "\n");
  await assert.rejects(assertVerified(p, state), /Source changed after verification/);
});

test("symlinks are rejected rather than followed outside the fixture", async (t) => {
  const { p } = await fixture(t);
  await fs.symlink("src/refunds.mjs", join(p.workspace, "link"));
  await assert.rejects(snapshot(p.workspace), /Symlink is outside/);
});

test("automated rehearsal labels plan acceptance without claiming human approval", async (t) => {
  const { p, state } = await plannedFixture(t);
  state.mode = "rehearsal";
  await approvePlan(p, state, "rehearsal-automation");
  const approval = JSON.parse(await fs.readFile(join(p.evidence, "plan-approval.json"), "utf8"));
  assert.equal(approval.kind, "simulated-rehearsal");
  assert.match(approval.identityNote, /not human approval/);
  state.phase = "reviewed";
  await assert.rejects(decide(p, state, { by: "automation", decision: "approve-for-pr", reason: "test" }), /must end in hold/);
});
