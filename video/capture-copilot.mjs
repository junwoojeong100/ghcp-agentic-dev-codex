import fs from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { paths, snapshot, digest } from "../demo/workflow.mjs";
import { createTerminal } from "./terminal.mjs";

const [name] = process.argv.slice(2);
const p = paths(name);
const state = JSON.parse(await fs.readFile(p.state, "utf8"));
if (state.engine !== "github-copilot-cli" || state.mode === "recorded-replay") throw new Error("Prepare a fresh GitHub Copilot recording workspace first.");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const videoOrigin = Date.now();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: join(p.run, "raw"), size: { width: 1920, height: 1080 } } });
const page = await context.newPage();
const video = page.video();
const terminal = await createTerminal({
  run: p.run, workspace: p.workspace, args: state.args,
  async onMark(mark) {
    await page.evaluate(() => window.demo.flush());
    mark.videoAt = (Date.now() - videoOrigin) / 1000;
    mark.sourceDigest = digest(await snapshot(p.workspace));
    const text = await page.evaluate(() => window.demo.text());
    await fs.writeFile(join(p.evidence, `${mark.name}.txt`), text);
    await page.screenshot({ path: join(p.evidence, `${mark.name}.png`) });
  },
});
let timer;
try {
  const completed = new Promise((resolve, reject) => { terminal.events.once("exit", resolve); terminal.events.once("failure", reject); });
  await page.goto(terminal.url);
  await page.waitForFunction(() => Boolean(window.demo));
  await page.evaluate(() => window.demo.start());
  let writing = false;
  timer = setInterval(async () => {
    if (writing) return;
    writing = true;
    try { await fs.writeFile(join(p.run, "latest-screen.txt"), await page.evaluate(() => window.demo.text())); }
    catch (error) { terminal.events.emit("failure", error); }
    finally { writing = false; }
  }, 400);
  console.log(`RECORDING_READY ${terminal.url}\nActual GitHub Copilot process is running. Inspect with: node demo/copilot.mjs screen ${name}\nAll control inputs are explicitly recorded as demo-automation, not human attestation.`);
  const exitCode = await completed;
  clearInterval(timer);
  await page.waitForTimeout(1200);
  await fs.writeFile(join(p.evidence, "terminal-history.txt"), await page.evaluate(() => window.demo.text(true)));
  await context.close();
  const destination = join(p.run, "copilot-terminal-unedited.webm");
  await video.saveAs(destination);
  await fs.writeFile(join(p.evidence, "recording.json"), JSON.stringify({ exitCode, videoOrigin: new Date(videoOrigin).toISOString(), terminalStartSeconds: (terminal.startedAt - videoOrigin) / 1000, durationSeconds: (Date.now() - videoOrigin) / 1000, rawVideo: "copilot-terminal-unedited.webm", resolution: [1920, 1080], capture: "live Chromium recording of unmodified real GitHub Copilot PTY output" }, null, 2) + "\n");
  console.log(`RECORDED ${destination}\nNative CLI exit code: ${exitCode}`);
  if (exitCode !== 0) process.exitCode = 1;
} finally {
  clearInterval(timer);
  await terminal.close();
  await browser.close();
}
