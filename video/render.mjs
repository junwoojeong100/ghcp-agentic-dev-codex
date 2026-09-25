import fs from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, ".build/video");
const segments = join(build, "segments");
await fs.mkdir(segments, { recursive: true });
const timeline = JSON.parse(await fs.readFile(join(build, "timeline.json"), "utf8"));
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 300000, maxBuffer: 8_000_000 });
  if (result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
for (const scene of timeline) {
  const source = scene.motion ? join(build, "raw", `${scene.source}.webm`) : join(root, ".build/screens", `${scene.source}.png`);
  await fs.access(source);
  const args = ["-v", "error", "-y", "-threads", "2"];
  if (scene.motion) args.push("-ss", "0.35", "-i", source);
  else args.push("-loop", "1", "-framerate", "30", "-i", source);
  args.push("-i", scene.audio, "-loop", "1", "-i", join(build, "captions", `${scene.id}-header.png`));
  for (const [index] of scene.captions.entries()) args.push("-loop", "1", "-i", join(build, "captions", `${scene.id}-${index+1}.png`));
  const filters = [`[0:v]fps=30,scale=1920:-2,crop=1920:1080:0:0,setsar=1${scene.motion ? `,tpad=start_mode=clone:start_duration=2:stop_mode=clone:stop_duration=${scene.duration}` : ""}[base]`, "[base][2:v]overlay=0:0:eof_action=repeat[v0]"];
  for (const [index, cue] of scene.captions.entries()) {
    filters.push(`[v${index}][${index+3}:v]overlay=0:938:eof_action=repeat:enable='between(t,${cue.start.toFixed(3)},${cue.end.toFixed(3)})'[v${index+1}]`);
  }
  const destination = join(segments, `${scene.id}.mp4`);
  args.push("-filter_complex_threads", "2", "-filter_complex", filters.join(";"), "-map", `[v${scene.captions.length}]`, "-map", "1:a:0", "-t", String(scene.duration), "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-threads", "2", "-pix_fmt", "yuv420p", "-r", "30", "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", destination);
  run("ffmpeg", args);
  console.log(`Encoded ${scene.id}: ${scene.duration}s`);
}
const list = join(build, "concat.txt");
await fs.writeFile(list, timeline.map((scene) => `file '${join(segments,scene.id + ".mp4")}'`).join("\n")+"\n");
const metadata = join(build, "chapters.ffmetadata");
await fs.writeFile(metadata, `;FFMETADATA1\ntitle=GitHub Copilot: Agentic Development in Action\ncomment=Recorded local demo; synthetic data; simulated acceptance; no real payments. Korean synthetic narration. Edited running time is not implementation time.\n${timeline.map((scene)=>`[CHAPTER]\nTIMEBASE=1/1000\nSTART=${scene.start*1000}\nEND=${(scene.start+scene.duration)*1000}\ntitle=${scene.chapter}\n`).join("")}`);
const destination = join(root, "delivery/github-copilot-cxo-demo-ko.mp4");
run("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", join(root,"delivery/github-copilot-cxo-demo-ko.srt"), "-i", metadata, "-map", "0:v:0", "-map", "0:a:0", "-map", "1:0", "-map_metadata", "2", "-map_chapters", "2", "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text", "-metadata:s:s:0", "language=kor", "-disposition:s:0", "0", "-t", "300", "-movflags", "+faststart", destination]);
const details = JSON.parse(run("ffprobe", ["-v","error","-show_format","-show_streams","-show_chapters","-of","json",destination]));
const video = details.streams.find((stream)=>stream.codec_type === "video");
const audio = details.streams.find((stream)=>stream.codec_type === "audio");
if (video.width !== 1920 || video.height !== 1080 || video.codec_name !== "h264" || !audio || audio.codec_name !== "aac" || Math.abs(Number(details.format.duration)-300) > 0.15 || details.chapters.length !== 18) {
  throw new Error("Final video does not meet the 1080p, five-minute, narrated chapter contract.");
}
await fs.writeFile(join(build,"verification.json"),JSON.stringify({file:destination,duration:Number(details.format.duration),resolution:[video.width,video.height],video:video.codec_name,audio:audio.codec_name,chapters:details.chapters.length,subtitleTrack:details.streams.some(s=>s.codec_type==="subtitle"),burnedCaptions:true},null,2));
console.log(`Created ${destination} (${details.format.duration}s)`);
