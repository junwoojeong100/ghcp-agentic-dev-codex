import fs from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { ROOT, paths, snapshot, digest } from "../demo/workflow.mjs";
import { verifyCopilot } from "../demo/copilot.mjs";

async function captureShot(page, base, name, selector) {
  const destination = join(base, "screens", `${name}.png`);
  if (!selector) { await page.screenshot({ path: destination }); return; }
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  const box = await element.boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) throw new Error(`No visible capture bounds for ${selector}`);
  const viewport = page.viewportSize();
  if (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width || box.y + box.height > viewport.height) throw new Error(`Evidence element exceeds the recorded viewport: ${selector}`);
  // Element screenshots can blank Chromium's recorded surface; crop the normal viewport capture instead.
  const crop = [Math.floor(box.x), Math.floor(box.y), Math.ceil(box.x + box.width), Math.ceil(box.y + box.height)];
  const result = spawnSync("python3", ["-c", "from PIL import Image; import sys,io,json; Image.open(io.BytesIO(sys.stdin.buffer.read())).crop(json.loads(sys.argv[1])).save(sys.argv[2])", JSON.stringify(crop), destination], { input: await page.screenshot(), timeout: 30000, maxBuffer: 1000000 });
  if (result.status !== 0) throw new Error(`Evidence crop failed: ${result.error?.message ?? result.stderr}`);
}

export async function captureApp(browser, baseURL, base) {
  const results = [];
  const shot = (page, name, selector) => captureShot(page, base, name, selector);
  async function record(name, perform) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: base + "/video/raw", size: { width: 1440, height: 900 } },
    });
    const demo = await context.newPage();
    const errors = [];
    demo.on("pageerror", (error) => errors.push(error.message));
    await demo.goto(baseURL);
    await demo.locator("#actor option").first().waitFor({ state: "attached" });
    const video = demo.video();
    try {
      await perform(demo);
      if (errors.length) throw new Error(`Uncaught browser error: ${errors.join("; ")}`);
      await demo.waitForTimeout(1300);
      results.push({ name, original: await video.path() });
    } finally {
      await context.close();
    }
    await video.saveAs(base + "/video/raw/" + name + ".webm");
  }
  async function state(demo, id, status) {
    await demo.locator(`tr[data-id="${id}"] .badge.${status}`).waitFor();
  }
  await record("after-request", async (demo) => {
    await demo.getByRole("button", { name: "데모 초기화", exact: true }).click();
    await state(demo, "RF-2401", "requested");
    await shot(demo, "after-full");
    await shot(demo, "after-policy", "#policy-banner");
    await demo.waitForTimeout(900);
    await demo.getByRole("button", { name: "RF-2401 승인 요청", exact: true }).click();
    await state(demo, "RF-2401", "pending_approval");
    await demo.getByRole("status").filter({ hasText: "HTTP 202" }).waitFor();
    await shot(demo, "after-pending-full");
    await shot(demo, "after-pending-row", 'tr[data-id="RF-2401"]');
    await shot(demo, "after-pending-metrics", ".metrics");
  });
  await record("after-block", async (demo) => {
    await state(demo, "RF-2401", "pending_approval");
    await demo.waitForTimeout(900);
    await demo.getByRole("button", { name: "RF-2401 자기 승인 차단 확인", exact: true }).click();
    await demo.getByRole("status").filter({ hasText: "403" }).waitFor();
    await state(demo, "RF-2401", "pending_approval");
    await shot(demo, "after-blocked-full");
    await shot(demo, "after-blocked-notice", "#notice");
    await shot(demo, "after-blocked-row", 'tr[data-id="RF-2401"]');
  });
  await record("after-approve", async (demo) => {
    await demo.getByRole("combobox", { name: "시연용 역할" }).selectOption("ops-park");
    await demo.getByRole("button", { name: "RF-2401 승인", exact: true }).waitFor();
    await demo.waitForTimeout(900);
    await demo.getByRole("button", { name: "RF-2401 승인", exact: true }).click();
    await state(demo, "RF-2401", "completed");
    await shot(demo, "after-approved-full");
    await shot(demo, "after-approved-row", 'tr[data-id="RF-2401"]');
    await shot(demo, "after-audit", "#audit-events");
    await demo.locator(".audit-section").scrollIntoViewIfNeeded();
    await shot(demo, "after-audit-full");
  });
  await record("after-small", async (demo) => {
    await demo.waitForTimeout(900);
    await demo.getByRole("button", { name: "RF-2402 환불 처리", exact: true }).click();
    await state(demo, "RF-2402", "completed");
    await demo.getByRole("status").filter({ hasText: "HTTP 200" }).waitFor();
    await shot(demo, "after-small-full");
    await demo.waitForTimeout(1200);
    await demo.locator(".audit-section").scrollIntoViewIfNeeded();
    await shot(demo, "after-small-audit");
  });
  await record("after-reject", async (demo) => {
    await demo.getByRole("button", { name: "RF-2403 승인 요청", exact: true }).click();
    await state(demo, "RF-2403", "pending_approval");
    await demo.getByRole("combobox", { name: "시연용 역할" }).selectOption("ops-park");
    await demo.getByRole("textbox", { name: "RF-2403 반려 이유" }).fill("계약 조건 확인 필요");
    await demo.waitForTimeout(900);
    await demo.getByRole("button", { name: "RF-2403 반려", exact: true }).click();
    await state(demo, "RF-2403", "rejected");
    await demo.evaluate(() => window.scrollTo(0, 0));
    await shot(demo, "after-rejected-full");
    const data = await demo.evaluate(async () => (await fetch("/api/refunds")).json());
    if (data.summary.completedCount !== 2 || data.summary.rejectedCount !== 1 || data.summary.pendingApprovalCount !== 0 || !data.events.some(event => event.outcome === "blocked")) {
      throw new Error("Browser end-to-end workflow did not reach the expected state.");
    }
    results.push({ browserChecks: { completed: 2, rejected: 1, pending: 0, auditEvents: data.events.length, selfApprovalBlocked: true, approvalAndRejection: true, lowValuePreserved: true }, state: data });
  });
  return results;
}

async function listen(workspace) {
  const { createDemoServer } = await import(pathToFileURL(join(workspace, "src/server.mjs")));
  const server = createDemoServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const url = `http://127.0.0.1:${server.address().port}`;
  if (!(await fetch(`${url}/api/refunds`)).ok) throw new Error("The demo server is not responsive.");
  return { server, url };
}

async function main() {
  const [name] = process.argv.slice(2);
  const p = paths(name);
  const verification = await verifyCopilot(name);
  const base = join(ROOT, ".build/copilot");
  await fs.mkdir(join(base, "screens"), { recursive: true });
  await fs.mkdir(join(base, "video/raw"), { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const servers = [];
  try {
    const before = await listen(join(ROOT, "demo/starter"));
    servers.push(before.server);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: join(base, "video/raw"), size: { width: 1440, height: 900 } } });
    const page = await context.newPage();
    const video = page.video();
    await page.goto(before.url);
    await page.locator('#actor option').first().waitFor({ state: "attached" });
    await page.screenshot({ path: join(base, "screens/before-full.png") });
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "RF-2401 환불 처리", exact: true }).click();
    await page.locator('tr[data-id="RF-2401"] .badge.completed').waitFor();
    await page.getByRole("status").filter({ hasText: "HTTP 200" }).waitFor();
    await captureShot(page, base, "before-completed-row", 'tr[data-id="RF-2401"]');
    await page.screenshot({ path: join(base, "screens/before-completed-full.png") });
    await page.waitForTimeout(1600);
    await context.close();
    await video.saveAs(join(base, "video/raw/before-process.webm"));
    const after = await listen(p.workspace);
    servers.push(after.server);
    const results = await captureApp(browser, after.url, base);
    if (digest(await snapshot(p.workspace)) !== verification.sourceDigest) throw new Error("Source changed during the browser recording.");
    const report = { sourceDigest: verification.sourceDigest, syntheticData: true, results };
    await fs.writeFile(join(p.evidence, "browser-verification.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    await Promise.all(servers.map((server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(`STOP: ${error.message}`); process.exitCode = 1; });
}
