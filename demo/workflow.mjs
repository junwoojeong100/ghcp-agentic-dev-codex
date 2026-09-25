import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEMO = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(DEMO, "..");
export const RUNS = join(ROOT, ".demo-runs");
export const ALLOWED = ["README.md", "src/refunds.mjs", "public/index.html", "public/app.mjs", "public/styles.css", "test/refunds.test.mjs"];
const REQUIRED_CHANGES = ["README.md", "src/refunds.mjs", "public/app.mjs", "test/refunds.test.mjs"];
const AGENTS = {
  plan: "agentic-demo-planner",
  implement: "agentic-demo-implementer",
  review: "agentic-demo-reviewer",
};
const now = () => new Date().toISOString();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const json = (value) => JSON.stringify(value, null, 2) + "\n";

export function paths(name) {
  if (!/^[a-z0-9][a-z0-9-]{0,47}$/.test(name ?? "")) {
    throw new Error("Run name must be 1-48 lowercase letters, digits or hyphens; no paths.");
  }
  const run = join(RUNS, name);
  return { run, workspace: join(run, "workspace"), evidence: join(run, "evidence"), state: join(run, "state.json") };
}

async function exists(path) {
  try { await fs.access(path); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function readJson(path) { return JSON.parse(await fs.readFile(path, "utf8")); }
async function saveState(p, state) { await fs.writeFile(p.state, json(state)); }
function requireCondition(condition, message) { if (!condition) throw new Error(message); }

function command(file, args, cwd, options = {}) {
  const env = { ...process.env, NO_COLOR: "1", ...options.env };
  // Child validation is a separate test run, not a nested node:test worker.
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(file, args, {
    cwd, encoding: "utf8", timeout: 300_000, maxBuffer: 12 * 1024 * 1024,
    env,
  });
  return {
    command: [file, ...args], exitCode: result.status,
    stdout: result.stdout ?? "", stderr: result.stderr ?? "",
    ...(result.error ? { error: result.error.message } : {}),
    ...(result.signal ? { signal: result.signal } : {}),
  };
}

function checked(file, args, cwd, options) {
  const result = command(file, args, cwd, options);
  requireCondition(result.exitCode === 0, `${file} failed (${result.exitCode ?? result.signal ?? "spawn"}): ${result.error ?? result.stderr ?? result.stdout}`);
  return result.stdout.trim();
}

function git(args, cwd) {
  return checked("git", ["-c", "core.hooksPath=/dev/null", ...args], cwd);
}

export async function snapshot(workspace) {
  const files = {};
  async function walk(relative) {
    const entries = await fs.readdir(join(workspace, relative), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!relative && [".git", "handoff"].includes(entry.name)) continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      requireCondition(!entry.isSymbolicLink(), `Symlink is outside the demo contract: ${path}`);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files[path] = hash(await fs.readFile(join(workspace, path)));
      else throw new Error(`Unsupported file type: ${path}`);
    }
  }
  await walk("");
  return files;
}

export function digest(files) {
  return hash(json(Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)))));
}

export function changes(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((path) => before[path] !== after[path]).sort();
}

export function checkScope(baseline, current, requireChanges = false) {
  const changed = changes(baseline, current);
  requireCondition(changed.every((path) => ALLOWED.includes(path)), `Out-of-scope files: ${changed.filter((path) => !ALLOWED.includes(path)).join(", ")}`);
  requireCondition(ALLOWED.every((path) => current[path]), "Required files must not be deleted.");
  if (requireChanges) requireCondition(REQUIRED_CHANGES.every((path) => changed.includes(path)), "Implementation must update source, UI, tests and README.");
  return changed;
}

export async function prepare(name, mode = "live") {
  requireCondition(["live", "rehearsal", "recorded-replay"].includes(mode), "Unknown run mode.");
  requireCondition(Number(process.versions.node.split(".")[0]) >= 22, "Node.js 22 or later is required.");
  const p = paths(name);
  await fs.mkdir(RUNS, { recursive: true });
  requireCondition(!(await exists(p.run)), `Run '${name}' already exists. Use a new run name; nothing was reset.`);
  await fs.mkdir(p.run);
  await fs.cp(join(DEMO, "starter"), p.workspace, { recursive: true, errorOnExist: true, force: false });
  await fs.mkdir(p.evidence);
  await fs.mkdir(join(p.workspace, "handoff"));
  await fs.cp(join(DEMO, "agents"), join(p.workspace, ".github/agents"), { recursive: true });
  await fs.copyFile(join(DEMO, "request.md"), join(p.workspace, "request.md"));
  git(["init", "--quiet", "--initial-branch=demo"], p.workspace);
  git(["add", "."], p.workspace);
  git(["-c", "user.name=Demo Fixture", "-c", "user.email=demo@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Synthetic demo baseline"], p.workspace);
  const baselineTest = command(process.execPath, ["--test", "--test-reporter=tap", "test/refunds.test.mjs"], p.workspace);
  await fs.writeFile(join(p.evidence, "00-baseline-tests.log"), baselineTest.stdout + baselineTest.stderr);
  requireCondition(baselineTest.exitCode === 0, "Baseline tests failed. See evidence/00-baseline-tests.log.");
  const baseline = await snapshot(p.workspace);
  const state = {
    schema: 1, name, mode, phase: "prepared", createdAt: now(),
    node: process.version, git: checked("git", ["--version"], ROOT),
    platform: `${process.platform}/${process.arch}`, baseline, baselineDigest: digest(baseline),
    baselineCommit: git(["rev-parse", "HEAD"], p.workspace),
  };
  await saveState(p, state);
  const count = baselineTest.stdout.match(/^# pass (\d+)$/m)?.[1];
  requireCondition(count, "Baseline test count was not recorded.");
  console.log(`Prepared ${mode} run: ${name}\nWorkspace: ${p.workspace}\nBaseline: ${count} tests passed. No agent has run.`);
  return state;
}

function requireLive(state) {
  requireCondition(["live", "rehearsal"].includes(state.mode), "Recorded replay cannot be presented or approved as a live agent run.");
}

export function copilotArgs(stage, workspace, prompt) {
  const tools = ["view", "glob", "grep", ...(stage === "implement" ? ["edit", "apply_patch"] : [])];
  const args = [
    "--agent", AGENTS[stage], "--silent", "--stream", "off", "--no-color",
    "--disable-builtin-mcps", "--no-custom-instructions", "--no-ask-user",
    "--no-remote", "--no-remote-export", "--disallow-temp-dir",
    "--available-tools", ...tools,
  ];
  if (stage === "implement") {
    for (const path of ALLOWED) args.push("--allow-tool", `write(${join(workspace, path)})`);
  }
  args.push("--prompt", prompt);
  return args;
}

async function invokeAgent(stage, p, state, prompt, outputName) {
  const agent = AGENTS[stage];
  for (const suffix of [".agent.md", ".md"]) {
    requireCondition(!(await exists(join(homedir(), ".copilot/agents", agent + suffix))), `A user-level '${agent}' agent would shadow this demo. Rename it or use a clean demo account.`);
  }
  const version = checked("copilot", ["--version"], p.workspace).split("\n")[0];
  if (state.copilot) requireCondition(state.copilot === version, "Copilot CLI version changed during the run. Prepare a new run and rehearse it.");
  state.copilot = version;
  await saveState(p, state);
  const args = copilotArgs(stage, p.workspace, prompt);
  const invocation = { stage, agent, startedAt: now(), version, args };
  await fs.writeFile(join(p.evidence, `${stage}-invocation.json`), json(invocation));
  console.log(`${state.mode.toUpperCase()} · actual GitHub Copilot CLI: ${agent}\nWaiting for the role's result (300-second timeout). No shell, network tool or subagent delegation is available.`);
  const result = command("copilot", args, p.workspace);
  await fs.writeFile(join(p.evidence, `${stage}-stdout.log`), result.stdout);
  await fs.writeFile(join(p.evidence, `${stage}-stderr.log`), result.stderr);
  await fs.writeFile(join(p.evidence, `${stage}-invocation.json`), json({ ...invocation, endedAt: now(), exitCode: result.exitCode, error: result.error, signal: result.signal }));
  requireCondition(result.exitCode === 0, `Copilot ${stage} failed. Read evidence/${stage}-stderr.log. Do not call a prepared result a live success.`);
  requireCondition(result.stdout.trim().length > 40, `Copilot ${stage} returned no usable handoff. Inspect its logs.`);
  const output = result.stdout.trim() + "\n";
  await fs.writeFile(join(p.evidence, outputName), output);
  await fs.writeFile(join(p.workspace, "handoff", outputName), output);
  console.log(output);
  return output;
}

export async function plan(p, state) {
  requireLive(state);
  requireCondition(state.phase === "prepared", "Plan is allowed only on a freshly prepared run.");
  requireCondition(digest(await snapshot(p.workspace)) === state.baselineDigest, "Baseline changed before planning. Prepare a new run.");
  const output = await invokeAgent("plan", p, state, "request.md와 현재 코드를 읽고 이 변경 요청의 계획만 작성하세요. 파일을 수정하거나 테스트를 실행하지 마세요. 계획 결과는 다음 역할에 파일로 전달하며 사람이 먼저 승인합니다.", "01-plan.md");
  requireCondition(digest(await snapshot(p.workspace)) === state.baselineDigest, "Planning modified the workspace. Stop and inspect the changes.");
  state.planHash = hash(output);
  state.phase = "planned";
  await saveState(p, state);
  console.log("STOP: A human must read the plan and explicitly run approve-plan before implementation.");
}

async function assertPlan(p, state) {
  requireCondition(hash(await fs.readFile(join(p.workspace, "handoff/01-plan.md"))) === state.planHash, "Plan changed after generation or approval. Prepare a new run.");
  requireCondition(hash(await fs.readFile(join(p.evidence, "01-plan.md"))) === state.planHash, "Recorded plan changed. Prepare a new run.");
}

export async function approvePlan(p, state, by) {
  requireLive(state);
  requireCondition(state.phase === "planned", "A generated plan must be reviewed before plan approval.");
  requireCondition(by?.trim(), "--by is required. This is a presenter label, not authenticated identity.");
  await assertPlan(p, state);
  requireCondition(digest(await snapshot(p.workspace)) === state.baselineDigest, "Workspace changed before approval. Prepare a new run.");
  const approval = {
    decision: "approve-plan", kind: state.mode === "rehearsal" ? "simulated-rehearsal" : "presenter-confirmation",
    by, at: now(), planHash: state.planHash, baselineDigest: state.baselineDigest, allowedFiles: ALLOWED,
    scope: "Synthetic local app only; no real payment, remote PR, merge or deployment.",
    identityNote: state.mode === "rehearsal" ? "Automated rehearsal acceptance, not human approval." : "Presenter-entered label, not authenticated identity.",
  };
  await fs.writeFile(join(p.evidence, "plan-approval.json"), json(approval));
  await fs.writeFile(join(p.workspace, "handoff/plan-approval.json"), json(approval));
  state.approvalHash = hash(json(approval));
  state.phase = "plan-approved";
  await saveState(p, state);
  console.log(`Plan acceptance recorded (${approval.kind}) for this exact plan and baseline. Implementation is now eligible.`);
}

async function assertApproval(p, state) {
  await assertPlan(p, state);
  requireCondition(state.approvalHash, "Human plan approval is required.");
  for (const path of [join(p.evidence, "plan-approval.json"), join(p.workspace, "handoff/plan-approval.json")]) {
    requireCondition(hash(await fs.readFile(path)) === state.approvalHash, "Plan approval was modified. Prepare a new run.");
  }
}

export async function implement(p, state) {
  requireLive(state);
  requireCondition(["plan-approved", "implementation-failed", "verification-failed"].includes(state.phase), "Implementation requires explicit plan approval; review does not grant write access.");
  await assertApproval(p, state);
  checkScope(state.baseline, await snapshot(p.workspace));
  if (state.phase === "plan-approved") requireCondition(digest(await snapshot(p.workspace)) === state.baselineDigest, "The approved baseline has changed.");
  state.phase = "implementation-failed";
  delete state.verificationHash;
  delete state.reviewHash;
  await saveState(p, state);
  await invokeAgent("implement", p, state, "request.md, handoff/01-plan.md, handoff/plan-approval.json을 읽고 명시한 범위만 구현하세요. 승인·반려 API 로직, 실제 UI, 감사 타임라인, 테스트와 README를 완성하고 기존 7개 테스트를 유지하세요. 감사 reason은 성공과 차단 모두에서 의미 있는 비어 있지 않은 문자열이어야 합니다. handoff/04-review.md가 있으면 지적 사항을 우선 보완하세요. 시연 정책은 기존 UI처럼 CS support만 process를 시작할 수 있게 확정합니다. 요청 상태의 건에 approver가 process를 호출하면 403/REQUESTER_REQUIRED와 blocked 감사 이벤트를 남기고 상태를 바꾸지 마세요. 중복·종결 상태의 재호출 409 우선순위는 유지하세요. fixture 역할 추가는 금지합니다. 식별 가능한 actor와 환불에 대한 금액 변조 및 알 수 없는 필드 요청도 400과 함께 차단 감사 이벤트를 남겨야 합니다. 외부 인수 테스트에는 변경 권한이 없습니다. 관련 제품 테스트와 문서를 보완하세요. apply_patch 또는 edit 도구로 허용 파일만 수정하세요. 셸이 없으므로 테스트는 다음 단계에서 실행합니다. handoff/03-tests.log가 있다면 이전 실패를 확인하세요. simulated-rehearsal은 사람의 승인이 아닙니다. 결과와 남은 검증을 한국어로 전달하세요.", "02-implementation.md");
  const current = await snapshot(p.workspace);
  state.changedFiles = checkScope(state.baseline, current, true);
  state.phase = "implemented";
  await saveState(p, state);
  console.log("Implementation complete, not approved. Run verify to execute independent checks.");
}

export async function verify(p, state) {
  requireCondition(["implemented", "verification-failed", "verified", "reviewed", "held", "approved-for-pr", "recorded-applied", "recorded-replay-verified"].includes(state.phase), "Verification requires an implementation or an explicitly recorded replay.");
  if (state.mode !== "recorded-replay") await assertApproval(p, state);
  const before = await snapshot(p.workspace);
  const changedFiles = checkScope(state.baseline, before, true);
  const diff = git(["diff", "--no-ext-diff", "--no-textconv", "--binary", "HEAD", "--", ...ALLOWED], p.workspace) + "\n";
  const checks = [
    command("git", ["diff", "--check"], p.workspace),
    command(process.execPath, ["--test", "--test-reporter=tap", "test/refunds.test.mjs"], p.workspace),
    command(process.execPath, ["--test", "--test-reporter=tap", join(DEMO, "refund-acceptance.test.mjs")], p.workspace, { env: { DEMO_APP_ROOT: p.workspace } }),
  ];
  const unchanged = digest(before) === digest(await snapshot(p.workspace));
  const success = checks.every((check) => check.exitCode === 0) && unchanged;
  const log = checks.map((check) => `$ ${check.command.join(" ")}\nexitCode=${check.exitCode}\n${check.stdout}${check.stderr}${check.error ? `\nERROR: ${check.error}\n` : ""}`).join("\n");
  const summary = {
    schema: 1, mode: state.mode, at: now(), node: process.version, platform: `${process.platform}/${process.arch}`,
    sourceDigest: digest(before), diffSha256: hash(diff), testLogSha256: hash(log), acceptanceSha256: hash(await fs.readFile(join(DEMO, "refund-acceptance.test.mjs"))),
    changedFiles, workspaceUnchangedDuringTests: unchanged, success,
    checks: checks.map(({ command, exitCode, stdout, error, signal }) => ({
      command: command.map((part) => part === process.execPath ? "node" : part.replace(DEMO, "$DEMO")),
      exitCode, tests: Number(stdout.match(/^# tests (\d+)$/m)?.[1] ?? 0),
      passed: Number(stdout.match(/^# pass (\d+)$/m)?.[1] ?? 0),
      failed: Number(stdout.match(/^# fail (\d+)$/m)?.[1] ?? 0), error, signal,
    })),
    boundary: "Local tests only. No GitHub Actions run, PR approval, merge or deployment.",
  };
  for (const [name, content] of [["change.diff", diff], ["03-verification.json", json(summary)], ["03-tests.log", log]]) {
    await fs.writeFile(join(p.evidence, name), content);
    await fs.writeFile(join(p.workspace, "handoff", name), content);
  }
  state.phase = success ? (state.mode === "recorded-replay" ? "recorded-replay-verified" : "verified") : "verification-failed";
  state.verificationHash = hash(json(summary));
  delete state.reviewHash;
  delete state.decision;
  await saveState(p, state);
  console.log(json(summary));
  requireCondition(success, "Verification failed. Inspect evidence/03-tests.log; do not advance to review.");
  return summary;
}

export async function assertVerified(p, state) {
  requireCondition(state.verificationHash, "Run verification before review or a decision.");
  const raw = await fs.readFile(join(p.evidence, "03-verification.json"));
  requireCondition(hash(raw) === state.verificationHash, "Verification record was modified.");
  requireCondition(hash(await fs.readFile(join(p.workspace, "handoff/03-verification.json"))) === state.verificationHash, "Verification handoff was modified.");
  const record = JSON.parse(raw);
  requireCondition(record.success && record.checks.every((check) => check.exitCode === 0), "All recorded checks must pass.");
  requireCondition(record.sourceDigest === digest(await snapshot(p.workspace)), "Source changed after verification. Run verify again, then obtain a new review.");
  requireCondition(record.acceptanceSha256 === hash(await fs.readFile(join(DEMO, "refund-acceptance.test.mjs"))), "Independent acceptance tests changed. Run verify again.");
  for (const path of [join(p.evidence, "change.diff"), join(p.workspace, "handoff/change.diff")]) {
    requireCondition(hash(await fs.readFile(path)) === record.diffSha256, "The reviewed diff was modified.");
  }
  for (const path of [join(p.evidence, "03-tests.log"), join(p.workspace, "handoff/03-tests.log")]) {
    requireCondition(hash(await fs.readFile(path)) === record.testLogSha256, "The test log was modified. Run verify again.");
  }
  return record;
}

export async function review(p, state) {
  requireLive(state);
  requireCondition(state.phase === "verified", "Review requires successful current verification.");
  await assertApproval(p, state);
  const verification = await assertVerified(p, state);
  const output = await invokeAgent("review", p, state, "request.md, 승인된 계획, handoff/change.diff, handoff/03-verification.json, handoff/03-tests.log와 실제 변경 파일을 읽고 검토하세요. 증거와 추정을 구분하고 파일/줄을 명시하세요. 코드를 바꾸거나 테스트를 직접 실행했다고 주장하지 마세요. 병합 승인 권한은 없습니다.", "04-review.md");
  requireCondition(digest(await snapshot(p.workspace)) === verification.sourceDigest, "Reviewer changed the source. Stop and re-verify.");
  state.reviewHash = hash(output);
  state.phase = "reviewed";
  await saveState(p, state);
  console.log("STOP: Read the review. A human must record hold or approve-for-pr. Neither decision merges or deploys anything.");
}

export async function decide(p, state, options) {
  requireLive(state);
  requireCondition(state.phase === "reviewed", "A fresh review must precede the human decision.");
  requireCondition(["hold", "approve-for-pr"].includes(options.decision), "--decision must be hold or approve-for-pr; merge approval is outside this demo.");
  requireCondition(state.mode !== "rehearsal" || options.decision === "hold", "Automated rehearsal must end in hold; it cannot grant human approval.");
  requireCondition(options.by?.trim() && options.reason?.trim(), "Both --by and --reason are required.");
  await assertApproval(p, state);
  const verification = await assertVerified(p, state);
  for (const path of [join(p.evidence, "04-review.md"), join(p.workspace, "handoff/04-review.md")]) {
    requireCondition(hash(await fs.readFile(path)) === state.reviewHash, "Review changed. Obtain a fresh review.");
  }
  state.decision = { ...options, kind: state.mode === "rehearsal" ? "simulated-rehearsal" : "presenter-confirmation", at: now(), sourceDigest: verification.sourceDigest, reviewHash: state.reviewHash, remoteAction: "none", identityNote: state.mode === "rehearsal" ? "Automated rehearsal hold. Human release approval remains pending." : "Presenter-entered label; not authenticated approval." };
  state.phase = options.decision === "hold" ? "held" : "approved-for-pr";
  await fs.writeFile(join(p.evidence, "05-human-decision.json"), json(state.decision));
  await saveState(p, state);
  console.log(json(state.decision));
}

export async function freeze(p, state) {
  requireLive(state);
  requireCondition(["held", "approved-for-pr"].includes(state.phase), "Record the human decision before preparing a fallback.");
  await assertApproval(p, state);
  await assertVerified(p, state);
  requireCondition(hash(await fs.readFile(join(p.evidence, "04-review.md"))) === state.reviewHash, "Review changed after the decision.");
  const target = join(DEMO, "fallback");
  requireCondition(!(await exists(target)), "Fallback already exists. Preserve it; use a deliberate versioned replacement rather than overwrite.");
  await fs.mkdir(target);
  const names = ["00-baseline-tests.log", "01-plan.md", "plan-approval.json", "02-implementation.md", "change.diff", "03-verification.json", "03-tests.log", "04-review.md", "05-human-decision.json", ...Object.keys(AGENTS).flatMap((stage) => [`${stage}-invocation.json`, `${stage}-stdout.log`, `${stage}-stderr.log`])];
  for (const name of ["02-first-implementation.md", "03-first-verification.json", "03-first-tests.log", "03-second-verification.json", "03-second-tests.log", "04-first-review.md", "04-second-review.md", "03-pre-review-verification.json", "06-role-policy.json"]) {
    if (await exists(join(p.evidence, name))) names.push(name);
  }
  const files = {};
  for (const name of names) {
    const content = (await fs.readFile(join(p.evidence, name), "utf8"))
      .replaceAll(p.workspace, "$DEMO_WORKSPACE").replaceAll(DEMO, "$DEMO").replaceAll(process.execPath, "node");
    await fs.writeFile(join(target, name), content);
    files[name] = hash(content);
  }
  for (const [recordName, logName] of [["03-verification.json", "03-tests.log"], ["03-first-verification.json", "03-first-tests.log"], ["03-second-verification.json", "03-second-tests.log"]]) {
    if (!files[recordName] || !files[logName]) continue;
    const record = await readJson(join(target, recordName));
    record.originalTestLogSha256 = record.testLogSha256;
    record.testLogSha256 = files[logName];
    record.pathNormalization = "Absolute local paths were replaced; testLogSha256 identifies the distributed log. The original digest is retained separately.";
    const content = json(record);
    await fs.writeFile(join(target, recordName), content);
    files[recordName] = hash(content);
  }
  const manifest = {
    schema: 1, kind: "recorded-live-rehearsal", recordedAt: now(),
    provenance: "Actual local Copilot CLI role invocations. Absolute paths normalized. Approval kind must be read separately; automated rehearsal is not human approval.",
    runMode: state.mode, approvalKind: state.decision.kind, subject: "refund-approval-and-audit",
    node: state.node, copilot: state.copilot, git: state.git, platform: state.platform,
    baselineDigest: state.baselineDigest, baseline: state.baseline,
    decision: state.decision.decision, files,
  };
  await fs.writeFile(join(target, "manifest.json"), json(manifest));
  console.log(`Recorded fallback saved to ${target}. Label every playback as prerecorded, not live.`);
}

export async function replay(name) {
  const source = join(DEMO, "fallback");
  const manifest = await readJson(join(source, "manifest.json"));
  requireCondition(manifest.kind === "recorded-live-rehearsal", "This fallback is not a recorded rehearsal.");
  for (const [name, expectedHash] of Object.entries(manifest.files)) {
    requireCondition(/^[a-zA-Z0-9.-]+$/.test(name), "Invalid fallback filename.");
    requireCondition(hash(await fs.readFile(join(source, name))) === expectedHash, `Fallback integrity check failed: ${name}`);
  }
  console.log("PRERECORDED REPLAY: No Copilot agent will run. Only the saved patch and current local tests will run.");
  const state = await prepare(name, "recorded-replay");
  const p = paths(name);
  requireCondition(state.baselineDigest === manifest.baselineDigest, "The starter or agents changed since recording. Do not reuse this fallback; rehearse again.");
  git(["apply", "--check", join(source, "change.diff")], p.workspace);
  git(["apply", join(source, "change.diff")], p.workspace);
  await fs.cp(source, join(p.run, "recorded"), { recursive: true });
  state.phase = "recorded-applied";
  state.recording = { recordedAt: manifest.recordedAt, copilot: manifest.copilot };
  await saveState(p, state);
  await verify(p, state);
  console.log(`Replay verified locally. Saved role outputs: ${join(p.run, "recorded")}\nThese historical approvals are not approval of a new live run.`);
}

function parseOptions(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    requireCondition(["--by", "--decision", "--reason", "--mode"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--"), `Invalid option: ${args[i]}`);
    requireCondition(!(args[i].slice(2) in options), `Duplicate option: ${args[i]}`);
    options[args[i].slice(2)] = args[i + 1];
  }
  return options;
}

async function main() {
  const [action, name, ...rest] = process.argv.slice(2);
  if (!action || action === "help") {
    console.log("Usage: node demo/workflow.mjs <prepare|plan|approve-plan|implement|verify|review|decision|freeze|replay|status> <new-run-name>\nApproval: approve-plan NAME --by PRESENTER\nDecision: decision NAME --by PRESENTER --decision hold --reason REASON\nPrepare and replay never overwrite a run. Agent calls require an authorized GitHub Copilot account.");
    return;
  }
  requireCondition(["prepare", "plan", "approve-plan", "implement", "verify", "review", "decision", "freeze", "replay", "status"].includes(action), `Unknown action: ${action}`);
  const options = parseOptions(rest);
  const permitted = action === "prepare" ? ["mode"] : action === "approve-plan" ? ["by"] : action === "decision" ? ["by", "decision", "reason"] : [];
  requireCondition(Object.keys(options).every((key) => permitted.includes(key)), `Unexpected option for ${action}.`);
  if (action === "prepare") {
    requireCondition(!options.mode || ["live", "rehearsal"].includes(options.mode), "prepare --mode must be live or rehearsal.");
    await prepare(name, options.mode ?? "live"); return;
  }
  if (action === "replay") { await replay(name); return; }
  const p = paths(name);
  if (action === "status") { console.log(json(await readJson(p.state))); return; }
  const lockPath = join(p.run, ".workflow.lock");
  let lock;
  try { lock = await fs.open(lockPath, "wx"); }
  catch (error) {
    if (error.code === "EEXIST") throw new Error("Another command is running, or a prior command was interrupted. Inspect the run before removing its .workflow.lock.");
    throw error;
  }
  try {
    const state = await readJson(p.state);
    if (action === "plan") await plan(p, state);
    else if (action === "approve-plan") await approvePlan(p, state, options.by);
    else if (action === "implement") await implement(p, state);
    else if (action === "verify") await verify(p, state);
    else if (action === "review") await review(p, state);
    else if (action === "decision") await decide(p, state, options);
    else if (action === "freeze") await freeze(p, state);
  } finally {
    await lock.close();
    await fs.unlink(lockPath);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`STOP: ${error.message}`); process.exitCode = 1; });
}
