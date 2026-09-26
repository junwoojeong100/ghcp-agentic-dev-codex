import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, ALLOWED, paths, prepare, snapshot, digest, checkScope } from "./workflow.mjs";

const json = (value) => JSON.stringify(value, null, 2) + "\n";
const hash = (value) => createHash("sha256").update(value).digest("hex");
const model = "auto";
export async function fileDigest(file) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(file)) digest.update(chunk);
  return digest.digest("hex");
}
export const PROMPTS = {
  plan: "/plan 120만 원 환불이 승인 없이 바로 완료되는 문제를 해결해 주세요. .github/copilot-instructions.md, request.md와 현재 코드를 읽고 원인과 간결한 4단계 계획을 먼저 제시해 주세요. 100만 원 이상은 다른 운영 승인자가 결정하고, 소액 처리는 유지하며, 요청·차단·결정은 감사 이력에 남겨야 합니다. 범위와 완료 기준을 확인한 뒤 구현 전 제 승인을 기다려 주세요.",
  implement: "계획을 승인합니다. .github/copilot-instructions.md에 허용된 제품 파일만 수정하고 제품 테스트와 불변 인수 테스트를 실제 실행해 주세요. 실패하면 원인을 수정하고 다시 검증하세요. 파일은 edit 또는 apply_patch 도구로 변경하고, 실행 권한은 Copilot의 일회성 승인 창에서 요청하세요. 전체 접근이나 영구 허용으로 전환하지 마세요. 마지막에 git diff --check와 남은 운영 조건을 확인하세요. 커밋·PR·병합·배포는 하지 마세요.",
  review: "/review 현재 로컬 변경을 request.md 및 .github/copilot-instructions.md의 계약 기준으로 검토해 주세요. 금액 경계, 역할 분리, 감사 이력, 테스트 누락에 집중하고 실질적인 지적만 한국어로 보고하세요. 실제 인증·결제·영구 저장은 명시된 제외 범위입니다. 파일을 수정하지 마세요.",
  finish: "최종 변경과 실행한 검증 결과, 남은 운영 조건을 8줄 이내로 정리해 주세요. 출시 판단은 HOLD로 유지합니다. 승인 입력은 시연용 자동화이며 실제 사람의 출시 승인은 아닙니다. 파일을 더 수정하지 마세요.",
};

export function copilotArgs(selectedModel = model) {
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(selectedModel)) throw new Error("Invalid model id.");
  return ["--model", selectedModel, ...(selectedModel === "auto" ? [] : ["--reasoning-effort", "high"]), "--mode", "interactive",
    "--banner", "--disable-builtin-mcps", "--no-remote", "--no-remote-export", "--disallow-temp-dir",
    "--available-tools", "view", "glob", "grep", "create", "edit", "apply_patch", "bash", "read_bash", "stop_bash", "ask_user", "task", "list_agents", "read_agent",
    "--deny-tool", "shell(git push)", "shell(git commit)", "shell(gh)", "shell(curl)", "shell(wget)", "shell(npm)", "shell(npx)", "shell(rm)", "shell(sudo)"];
}

function command(file, args, cwd, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(file, args, { cwd, env, encoding: "utf8", timeout: 120000, maxBuffer: 16000000, stdio: ["ignore", "pipe", "pipe"] });
  if (result.error) throw result.error;
  return { command: [file, ...args], exitCode: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function prepareWorkspace(name, mode) {
  const state = await prepare(name, mode);
  const p = paths(name);
  await fs.copyFile(join(ROOT, "demo/copilot-instructions.md"), join(p.workspace, ".github/copilot-instructions.md"));
  await fs.copyFile(join(ROOT, "demo/refund-acceptance.test.mjs"), join(p.workspace, "test/acceptance.test.mjs"));
  const git = command("git", ["-c", "core.hooksPath=/dev/null", "add", ".github/copilot-instructions.md", "test/acceptance.test.mjs"], p.workspace);
  if (git.exitCode !== 0) throw new Error(git.stderr);
  const commit = command("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Demo Fixture", "-c", "user.email=demo@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Add immutable Copilot demo contract"], p.workspace);
  if (commit.exitCode !== 0) throw new Error(commit.stderr);
  state.baseline = await snapshot(p.workspace);
  state.baselineDigest = digest(state.baseline);
  state.engine = "github-copilot-cli";
  return state;
}

export function copilotEnvironment(run, inherited = process.env) {
  const env = { ...inherited, COPILOT_HOME: join(run, "copilot-home"), COPILOT_ALLOW_ALL: "false", COPILOT_ASSISTED_APPROVAL: "false", COPILOT_AUTO_UPDATE: "false" };
  for (const key of Object.keys(env)) {
    if (key.startsWith("COPILOT_PROVIDER_") || ["COPILOT_CUSTOM_INSTRUCTIONS_DIRS", "CODEX_THREAD_ID", "CODEX_SESSION_ID", "CODEX_GHCP_BRIDGE_TOKEN", "NODE_TEST_CONTEXT", "NO_COLOR"].includes(key)) delete env[key];
  }
  return env;
}

export async function prepareCopilot(name, selectedModel = model) {
  const args = copilotArgs(selectedModel);
  const state = await prepareWorkspace(name, "rehearsal");
  const p = paths(name);
  state.model = selectedModel;
  state.reasoningEffort = selectedModel === "auto" ? "provider-default" : "high";
  state.args = args;
  const version = command("copilot", ["--version"], ROOT);
  if (version.exitCode !== 0) throw new Error(version.stderr);
  state.copilot = version.stdout.trim().split("\n")[0];
  await fs.mkdir(join(p.run, "copilot-home"), { mode: 0o700 });
  await fs.writeFile(join(p.run, "copilot-home/settings.json"), json({ banner: "always", bannerStyle: "classic", notifications: false, beep: false, autoUpdate: false, customAgents: { defaultLocalOnly: true } }), { mode: 0o600 });
  const baseline = command("node", ["--test", "--test-reporter=tap", "test/acceptance.test.mjs"], p.workspace, { DEMO_APP_ROOT: p.workspace });
  if (baseline.exitCode === 0) throw new Error("The starter unexpectedly meets the new policy; this is not a before/after demo.");
  await fs.writeFile(join(p.evidence, "00-baseline-acceptance.log"), baseline.stdout + baseline.stderr);
  await fs.writeFile(p.state, json(state));
  await fs.writeFile(join(p.evidence, "invocation.json"), json({ executable: "copilot", version: state.copilot, args: state.args, workspace: "isolated synthetic fixture", inputMode: "demo-automation", globalDefaultsModified: false, permissions: "Native interactive approvals; no broad tool grants; dedicated COPILOT_HOME." }));
  console.log(`Actual GitHub Copilot recording prepared: ${name}\n${state.copilot} / ${selectedModel} / native interactive approvals`);
  return state;
}

export async function verifyCopilot(name) {
  const p = paths(name);
  const state = JSON.parse(await fs.readFile(p.state, "utf8"));
  if (state.engine !== "github-copilot-cli") throw new Error("Not a GitHub Copilot CLI run.");
  const acceptanceHash = hash(await fs.readFile(join(ROOT, "demo/refund-acceptance.test.mjs")));
  if (acceptanceHash !== state.baseline["test/acceptance.test.mjs"]) throw new Error("The independent acceptance contract changed after preparation.");
  const before = await snapshot(p.workspace);
  const changedFiles = checkScope(state.baseline, before, true);
  const checks = [
    command("git", ["diff", "--check"], p.workspace),
    command("node", ["--test", "--test-reporter=tap", "test/refunds.test.mjs"], p.workspace),
    command("node", ["--test", "--test-reporter=tap", join(ROOT, "demo/refund-acceptance.test.mjs")], p.workspace, { DEMO_APP_ROOT: p.workspace }),
  ];
  const unchanged = digest(before) === digest(await snapshot(p.workspace));
  const results = checks.map(({ command, exitCode, stdout }) => ({
    command: command.map((part) => part.replace(ROOT, "$REPO")), exitCode,
    tests: Number(stdout.match(/^# tests (\d+)$/m)?.[1] ?? 0),
    passed: Number(stdout.match(/^# pass (\d+)$/m)?.[1] ?? 0),
    failed: Number(stdout.match(/^# fail (\d+)$/m)?.[1] ?? 0),
  }));
  const completeTests = results[1].tests >= 7 && results.slice(1).every((result) => result.tests > 0 && result.passed === result.tests && result.failed === 0);
  const summary = {
    engine: "github-copilot-cli", recordedAt: new Date().toISOString(), sourceDigest: digest(before), changedFiles,
    workspaceUnchangedDuringTests: unchanged, success: unchanged && completeTests && checks.every((check) => check.exitCode === 0),
    acceptanceSha256: acceptanceHash, checks: results,
    boundary: "Independent local execution against the recorded code. No production release approval.",
  };
  const log = checks.map((check) => `$ ${check.command.join(" ")}\nexitCode=${check.exitCode}\n${check.stdout}${check.stderr}`).join("\n");
  const diff = command("git", ["diff", "--binary", "HEAD", "--", ...ALLOWED], p.workspace);
  if (diff.exitCode !== 0) throw new Error(diff.stderr);
  await fs.writeFile(join(p.evidence, "03-tests.log"), log);
  await fs.writeFile(join(p.evidence, "03-verification.json"), json(summary));
  await fs.writeFile(join(p.evidence, "change.diff"), diff.stdout);
  state.verifiedDigest = summary.success ? summary.sourceDigest : null;
  await fs.writeFile(p.state, json(state));
  console.log(json(summary));
  if (!summary.success) throw new Error(`Verification failed. Read ${join(p.evidence, "03-tests.log")}`);
  return summary;
}

export async function control(name, action, body) {
  const config = JSON.parse(await fs.readFile(join(paths(name).run, "terminal-control.json"), "utf8"));
  const response = await fetch(`${config.url}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-Demo-Token": config.token }, body: JSON.stringify(body ?? {}) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function freezeCopilot(name) {
  const p = paths(name);
  const state = JSON.parse(await fs.readFile(p.state, "utf8"));
  if (state.mode !== "rehearsal") throw new Error("A replay cannot be published as a fresh CLI recording.");
  const recording = JSON.parse(await fs.readFile(join(p.evidence, "recording.json"), "utf8"));
  if (recording.exitCode !== 0) throw new Error("Copilot did not exit successfully.");
  if (recording.rawVideo !== "copilot-terminal-unedited.webm") throw new Error("Unexpected raw recording path.");
  recording.sha256 = await fileDigest(join(p.run, recording.rawVideo));
  const verification = await verifyCopilot(name);
  const browser = JSON.parse(await fs.readFile(join(p.evidence, "browser-verification.json"), "utf8"));
  const browserChecks = browser.results.find((result) => result.browserChecks)?.browserChecks;
  if (browser.sourceDigest !== verification.sourceDigest || !browserChecks?.selfApprovalBlocked || !browserChecks.approvalAndRejection || !browserChecks.lowValuePreserved) throw new Error("Re-record the browser demo against the final reviewed source.");
  const marks = JSON.parse(await fs.readFile(join(p.evidence, "terminal-marks.json"), "utf8"));
  const approvalMarks = marks.filter((mark) => mark.name.startsWith("approval-"));
  if (!approvalMarks.length) throw new Error("No native approval prompt was captured.");
  for (const mark of approvalMarks) {
    const screen = await fs.readFile(join(p.evidence, `${mark.name}.txt`), "utf8");
    if (!/Would you like|Do you want|Do you approve|Allow|Yes|approve/i.test(screen)) throw new Error("Approval marker does not contain an actual CLI prompt.");
  }
  const planMark = marks.find((mark) => mark.name === "plan-ready");
  const reviewMark = marks.find((mark) => mark.name === "review-result");
  if (!planMark || planMark.sourceDigest !== state.baselineDigest) throw new Error("The recorded plan must precede any product edits.");
  if (!reviewMark || reviewMark.sourceDigest !== verification.sourceDigest) throw new Error("The final source needs a matching recorded review.");
  const sessionState = join(p.run, "copilot-home/session-state");
  const plans = (await fs.readdir(sessionState, { recursive: true })).filter((path) => /^[a-f0-9-]+\/plan\.md$/.test(path));
  if (plans.length !== 1) throw new Error("Expected exactly one plan in this isolated Copilot session.");
  await fs.copyFile(join(sessionState, plans[0]), join(p.evidence, "01-plan.md"));
  const files = {};
  for (const entry of await fs.readdir(p.evidence, { withFileTypes: true })) {
    if (entry.isFile() && entry.name !== "manifest.json") files[entry.name] = hash(await fs.readFile(join(p.evidence, entry.name)));
  }
  const manifest = {
    schema: 1, kind: "actual-copilot-pty-recording", recordedAt: new Date().toISOString(), copilot: state.copilot,
    model: state.model, reasoningEffort: state.reasoningEffort, node: state.node, platform: state.platform,
    inputMode: "demo-automation", approvalKind: "actual-native-dialog-with-scripted-demo-input", approvalCount: approvalMarks.length,
    approvalCounting: "Captured native permission dialogs, including declined requests; not a count of human approvals.",
    browserCapture: { engine: "Playwright Chromium", headless: true },
    decision: "HOLD", globalDefaultsModified: false, baseline: state.baseline, baselineDigest: state.baselineDigest, sourceDigest: verification.sourceDigest,
    provenance: "Real GitHub Copilot CLI process on a pseudo-terminal, streamed unmodified into xterm and recorded live by Chromium. No replacement CLI transcript. Input automation is not authenticated human release approval.",
    recording, files,
  };
  await fs.writeFile(join(p.evidence, "manifest.json"), json(manifest));
  const target = join(ROOT, "demo/copilot-evidence");
  await fs.mkdir(target, { recursive: false });
  await fs.cp(p.evidence, target, { recursive: true, errorOnExist: true, force: false });
  console.log(`GitHub Copilot evidence preserved at ${target}`);
}

export async function checkEvidence(directory) {
  const manifest = JSON.parse(await fs.readFile(join(directory, "manifest.json"), "utf8"));
  if (manifest.kind !== "actual-copilot-pty-recording" || manifest.decision !== "HOLD") throw new Error("Expected a recorded Copilot demo, not release approval.");
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(name) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error("Invalid evidence filename or digest.");
    if (hash(await fs.readFile(join(directory, name))) !== expected) throw new Error(`Evidence integrity check failed: ${name}`);
  }
  for (const required of ["change.diff", "terminal.cast", "terminal-inputs.jsonl", "terminal-marks.json", "03-verification.json", "recording.json"]) {
    if (!manifest.files[required]) throw new Error(`Missing required recording evidence: ${required}`);
  }
  return manifest;
}

export async function replayCopilot(name) {
  const source = join(ROOT, "demo/copilot-evidence");
  const manifest = await checkEvidence(source);
  console.log("PRERECORDED COPILOT REPLAY: apply the recorded patch and run current local tests. No model call or new approval.");
  const state = await prepareWorkspace(name, "recorded-replay");
  const p = paths(name);
  if (state.baselineDigest !== manifest.baselineDigest) throw new Error("The recording baseline no longer matches. Do not reuse this patch.");
  for (const args of [["apply", "--check", join(source, "change.diff")], ["apply", join(source, "change.diff")]]) {
    const result = command("git", args, p.workspace);
    if (result.exitCode !== 0) throw new Error(result.stderr);
  }
  state.recording = { recordedAt: manifest.recordedAt, copilot: manifest.copilot, sourceDigest: manifest.sourceDigest };
  await fs.writeFile(p.state, json(state));
  const verification = await verifyCopilot(name);
  if (verification.sourceDigest !== manifest.sourceDigest) throw new Error("Replayed code does not match the recorded implementation.");
  return state;
}

async function launch(name) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Run launch in an interactive terminal. Use demo:record for a recorded browser terminal.");
  const p = paths(name);
  const state = JSON.parse(await fs.readFile(p.state, "utf8"));
  if (state.engine !== "github-copilot-cli" || state.mode === "recorded-replay") throw new Error("Prepare a fresh Copilot workspace before launching.");
  const child = spawn("copilot", state.args, { cwd: p.workspace, env: copilotEnvironment(p.run), stdio: "inherit" });
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", (code, signal) => signal ? reject(new Error(`Copilot exited on ${signal}`)) : resolve(code)); });
  if (code !== 0) throw new Error(`Copilot exited with code ${code}.`);
}

async function main() {
  const [action, name, ...rest] = process.argv.slice(2);
  if (action === "prepare") await prepareCopilot(name, rest[0] ?? model);
  else if (action === "launch") await launch(name);
  else if (action === "replay") await replayCopilot(name);
  else if (action === "verify") await verifyCopilot(name);
  else if (action === "freeze") await freezeCopilot(name);
  else if (action === "screen") console.log(await fs.readFile(join(paths(name).run, "latest-screen.txt"), "utf8"));
  else if (action === "mark") console.log(await control(name, "mark", { name: rest[0] }));
  else if (action === "prompt") {
    if (!PROMPTS[rest[0]]) throw new Error("Unknown demo prompt.");
    console.log(await control(name, "input", { data: `\u001b[200~${PROMPTS[rest[0]]}\u001b[201~`, source: "demo-automation" }));
  }
  else if (action === "input") {
    const data = rest[0] === "--file" ? await fs.readFile(resolve(rest[1]), "utf8") : rest.join(" ");
    console.log(await control(name, "input", { data, source: "demo-automation" }));
  } else if (action === "key") {
    const keys = { enter: "\r", escape: "\u001b", down: "\u001b[B", up: "\u001b[A", "shift-tab": "\u001b[Z", "ctrl-c": "\u0003", "ctrl-d": "\u0004" };
    if (!keys[rest[0]]) throw new Error("Unknown terminal key.");
    console.log(await control(name, "input", { data: keys[rest[0]], source: "demo-automation" }));
  } else if (action === "stop") console.log(await control(name, "stop"));
  else throw new Error("Usage: node demo/copilot.mjs <prepare|launch|replay|screen|prompt|input|key|mark|verify|freeze|stop> RUN [value]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`STOP: ${error.message}`); process.exitCode = 1; });
}
