import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { scenes } from "./scenes.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, ".build/video/audio");
await fs.mkdir(build, { recursive: true });
await fs.mkdir(join(root, "delivery"), { recursive: true });
function run(cmd, args) {
  const result = spawnSync(cmd, args, { encoding: "utf8", timeout: 180000, maxBuffer: 5_000_000 });
  if (result.status !== 0) throw new Error(`${cmd}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
function duration(path) {
  const value = Number(run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path]).trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid audio duration: ${path}`);
  return value;
}
const stamp = (seconds) => {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms/60000)%60).padStart(2,"0")}:${String(Math.floor(ms/1000)%60).padStart(2,"0")},${String(ms%1000).padStart(3,"0")}`;
};
const cues = [], timeline = [];
let offset = 0;
for (const scene of scenes) {
  const sentences = scene.narration.split(/(?<=[.!?])\s+/);
  const clips = [];
  for (const [index, sentence] of sentences.entries()) {
    const file = join(build, `${scene.id}-${index + 1}.aiff`);
    run("say", ["-v", "Yuna", "-r", "175", "-o", file, sentence]);
    clips.push({ file, text: sentence, duration: duration(file) });
  }
  const spoken = clips.reduce((sum, clip) => sum + clip.duration, 0);
  const tempo = Math.max(1, spoken / (scene.duration - 1));
  if (tempo > 1.22) throw new Error(`Narration is too long for ${scene.id}: ${spoken}s in ${scene.duration}s. Shorten the script.`);
  let cursor = 0.3;
  const sceneCues = [];
  for (const [index, clip] of clips.entries()) {
    const wav = join(build, `${scene.id}-${index+1}.wav`);
    run("ffmpeg", ["-v", "error", "-y", "-i", clip.file, "-af", `atempo=${tempo}`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", wav]);
    const length = duration(wav);
    const cue = { text: clip.text, start: cursor, end: Math.min(cursor + length, scene.duration - 0.2) };
    sceneCues.push(cue);
    cues.push({ ...cue, start: offset + cue.start, end: offset + cue.end });
    cursor += length;
    clip.wav = wav;
  }
  const concat = join(build, `${scene.id}-concat.txt`);
  await fs.writeFile(concat, clips.map((clip) => `file '${clip.wav}'`).join("\n") + "\n");
  const output = join(build, `${scene.id}.wav`);
  run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", concat, "-af", `adelay=300|300,apad,atrim=duration=${scene.duration},loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=${scene.duration-0.18}:d=0.18`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", output]);
  timeline.push({ ...scene, start: offset, audio: output, captions: sceneCues, spokenSeconds: cursor - 0.3, tempo });
  offset += scene.duration;
  console.log(`${scene.id}: ${Math.round(spoken*10)/10}s spoken, ${scene.duration}s scene, speed ${tempo.toFixed(3)}`);
}
await fs.writeFile(join(root, ".build/video/timeline.json"), JSON.stringify(timeline, null, 2));
await fs.writeFile(join(root, "delivery/github-copilot-cxo-demo-ko.srt"), cues.map((cue,i)=>`${i+1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${cue.text}\n`).join("\n"));
await fs.writeFile(join(root, "delivery/video-script.md"), `# 5분 영상 대본\n\n실제 로컬 실행을 편집한 사전 녹화 영상. 한국어 음성은 macOS Yuna 합성 음성이다.\n합성 고객과 모의 역할을 사용하며 실제 결제와 운영 배포는 없다. 영상 길이는 개발 소요 시간이 아니다.\n\n${timeline.map((scene)=>`## ${stamp(scene.start).slice(0,8)} ${scene.chapter}\n\n${scene.narration}\n`).join("\n")}`);
console.log(`Prepared ${timeline.length} scenes, ${offset} seconds, ${cues.length} subtitle cues.`);
