import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { copilotArgs, copilotEnvironment, checkEvidence } from "./copilot.mjs";
import { RUNS } from "./workflow.mjs";
import { validInput } from "../video/terminal.mjs";
import { scenes } from "../video/scenes.mjs";

test("Copilot recording keeps native approvals and disables remote changes", () => {
  const args = copilotArgs("gpt-6-astra");
  assert.equal(args[args.indexOf("--mode") + 1], "interactive");
  for (const flag of ["--allow-all", "--allow-all-tools", "--allow-all-paths", "--allow-tool", "--yolo", "--assisted-approval", "--no-custom-instructions"]) assert.equal(args.includes(flag), false);
  assert.ok(args.includes("--disable-builtin-mcps"));
  assert.ok(args.includes("--no-remote-export"));
  assert.ok(args.includes("shell(git push)"));
  assert.throws(() => copilotArgs("../../other"), /Invalid model/);
});

test("a recording cannot inherit unrestricted approvals or a different model provider", () => {
  const original = { PATH: "/bin", COPILOT_ALLOW_ALL: "true", COPILOT_HOME: "/global", COPILOT_ASSISTED_APPROVAL: "true", COPILOT_PROVIDER_BASE_URL: "https://example.invalid", CODEX_GHCP_BRIDGE_TOKEN: "unit-test-placeholder" };
  const env = copilotEnvironment("/recording", original);
  assert.equal(env.COPILOT_HOME, "/recording/copilot-home");
  assert.equal(env.COPILOT_ALLOW_ALL, "false");
  assert.equal(env.COPILOT_ASSISTED_APPROVAL, "false");
  assert.equal(env.COPILOT_PROVIDER_BASE_URL, undefined);
  assert.equal(env.CODEX_GHCP_BRIDGE_TOKEN, undefined);
  assert.equal(env.PATH, "/bin");
  assert.equal(original.COPILOT_ALLOW_ALL, "true");
});

test("CXO video is five minutes with a majority of actual CLI footage", () => {
  assert.equal(scenes.reduce((sum, scene) => sum + scene.duration, 0), 300);
  assert.equal(scenes.filter((scene) => scene.terminal).reduce((sum, scene) => sum + scene.duration, 0), 156);
  assert.ok(scenes.filter((scene) => scene.terminal).every((scene) => scene.motion && scene.source.startsWith("ghcp-")));
});

test("recording evidence fails closed on incomplete or unsafe manifests", async (t) => {
  const directory = join(RUNS, `unit-evidence-${randomUUID()}`);
  await fs.mkdir(directory, { recursive: true });
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const save = (manifest) => fs.writeFile(join(directory, "manifest.json"), JSON.stringify(manifest));
  await save({ kind: "actual-copilot-pty-recording", decision: "HOLD", files: {} });
  await assert.rejects(checkEvidence(directory), /Missing required/);
  await save({ kind: "actual-copilot-pty-recording", decision: "HOLD", files: { "../outside": "a".repeat(64) } });
  await assert.rejects(checkEvidence(directory), /Invalid evidence/);
  await save({ kind: "actual-copilot-pty-recording", decision: "APPROVED", files: {} });
  await assert.rejects(checkEvidence(directory), /not release approval/);
});

test("terminal input has bounded size and an explicit provenance channel", () => {
  assert.equal(validInput({ data: "\r", source: "demo-automation" }), true);
  for (const body of [null, {}, { data: "", source: "demo-automation" }, { data: "x".repeat(32769), source: "demo-automation" }, { data: "y", source: "human-approved" }]) {
    assert.equal(Boolean(validInput(body)), false);
  }
});
