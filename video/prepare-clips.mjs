import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { ROOT, paths } from "../demo/workflow.mjs";
import { checkEvidence, fileDigest } from "../demo/copilot.mjs";
import { scenes } from "./scenes.mjs";

const [name] = process.argv.slice(2);
const p = paths(name);
const manifest = await checkEvidence(join(ROOT, "demo/copilot-evidence"));
const state = JSON.parse(await fs.readFile(p.state, "utf8"));
if (state.verifiedDigest !== manifest.sourceDigest) throw new Error("Choose the run that produced the published Copilot evidence.");
const marks = JSON.parse(await fs.readFile(join(p.evidence, "terminal-marks.json"), "utf8"));
const recording = JSON.parse(await fs.readFile(join(p.evidence, "recording.json"), "utf8"));
const source = join(p.run, recording.rawVideo);
const sourceSha256 = await fileDigest(source);
if (sourceSha256 !== manifest.recording.sha256) throw new Error("The raw video does not match the recording manifest.");
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 300000, maxBuffer: 5000000 });
  if (result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
const probe = JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-of", "json", source]));
const total = Number(probe.format.duration);
const origin = Date.parse(probe.format.tags?.creation_time ?? recording.videoOrigin);
if (!Number.isFinite(total) || !Number.isFinite(origin)) throw new Error("Cannot establish the raw video timeline.");
function at(name) {
  const mark = marks.find((item) => item.name === name);
  if (!mark) throw new Error(`Missing actual CLI marker: ${name}`);
  return (Date.parse(mark.recordedAt) - origin) / 1000;
}
function window(start, duration) {
  if (!Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || start + duration > total + 0.05 || duration <= 0) throw new Error(`Invalid source interval ${start} + ${duration}, video=${total}`);
  return { start, duration };
}
function endpoints(startName, endName, duration) {
  const start = at(startName), end = at(endName);
  if (end <= start) throw new Error("Recording markers are out of order.");
  if (end - start <= duration) return [window(Math.max(0, end - duration), duration)];
  return [window(start, 8), window(end - (duration - 8), duration - 8)];
}
const definitions = [
  ["ghcp-ready", [window(at("cli-ready") - 13, 14)]],
  ["ghcp-plan-work", [window(at("plan-start") + 0.5, 18)]],
  ["ghcp-plan", [window(at("plan-ready") - 16, 18)]],
  ["ghcp-plan-accept", [window(at("plan-accept") - 4, 7), window(at("implementation-approved") - 1, 7)]],
  ["ghcp-implementation", [window(at("first-write-approved"), 5), window(at("ui-write-approved"), 5), window(at("tests-write-approved"), 6), window(at("docs-write-approved"), 6)].sort((a, b) => a.start - b.start)],
  ["ghcp-approval", [window(at("approval-tests") - 8, 22)]],
  ["ghcp-tests", endpoints("tests-final-start", "tests-complete", 24)],
  ["ghcp-review", endpoints("review-start", "final-summary", 24)],
];
const build = join(ROOT, ".build/copilot");
await fs.mkdir(join(build, "video/raw"), { recursive: true });
await fs.mkdir(join(build, "screens"), { recursive: true });
const clips = [];
for (const [name, windows] of definitions) {
  const scene = scenes.find((item) => item.source === name && item.terminal);
  const seconds = windows.reduce((sum, item) => sum + item.duration, 0);
  if (!scene || Math.abs(seconds - scene.duration) > 0.01) throw new Error(`Clip duration does not match ${name}`);
  const args = ["-v", "error", "-y"];
  for (const item of windows) args.push("-ss", item.start.toFixed(3), "-t", item.duration.toFixed(3), "-i", source);
  const filters = windows.map((_, i) => `[${i}:v]setpts=PTS-STARTPTS,fps=25[v${i}]`);
  filters.push(`${windows.map((_, i) => `[v${i}]`).join("")}concat=n=${windows.length}:v=1:a=0[out]`);
  const file = join(build, "video/raw", `${name}.webm`);
  args.push("-filter_complex_threads", "2", "-filter_complex", filters.join(";"), "-map", "[out]", "-an", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "25", "-cpu-used", "5", "-threads", "2", file);
  run("ffmpeg", args);
  clips.push({ name, windows, seconds, sha256: await fileDigest(file), rate: 1, editing: "Only cuts between original real-time video intervals; no replacement terminal text." });
  console.log(`Extracted actual Copilot footage: ${name} (${seconds}s)`);
}
for (const [file, mark] of [["ghcp-ready", "cli-ready"], ["ghcp-plan", "plan-ready"], ["ghcp-approval", "approval-tests"], ["ghcp-implementation", "approval-write"], ["ghcp-tests", "tests-complete"], ["ghcp-review", "final-summary"]]) {
  run("python3", ["-c", "from PIL import Image; import sys; Image.open(sys.argv[1]).crop((64,96,1856,918)).save(sys.argv[2])", join(p.evidence, `${mark}.png`), join(build, "screens", `${file}.png`)]);
}
await fs.writeFile(join(build, "video/terminal-clips.json"), JSON.stringify({ sourceVideo: recording.rawVideo, sourceSha256, sourceDuration: total, sourceClock: new Date(origin).toISOString(), clips }, null, 2) + "\n");
