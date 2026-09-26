import fs from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { ROOT } from "../demo/workflow.mjs";

const output = join(ROOT, ".build/copilot/screens");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(join(ROOT, "delivery/slides.html")).href + "?video=1");
  await page.evaluate(() => document.fonts.ready);
  const count = await page.locator(".slide").count();
  if (count !== 13) throw new Error("The CXO deck must contain 13 slides.");
  const report = [];
  for (let i = 1; i <= count; i++) {
    await page.evaluate((number) => { location.hash = String(number); }, i);
    await page.locator(`.slide[data-slide="${i}"]`).waitFor({ state: "visible" });
    const issues = await page.locator(`.slide[data-slide="${i}"]`).evaluate((slide) => [...slide.children].flatMap((child) => {
      const box = child.getBoundingClientRect();
      const text = child.textContent.trim();
      const errors = [];
      if (box.left < -1 || box.top < -1 || box.right > 1281 || box.bottom > 721) errors.push(`Outside slide: ${text}`);
      if (child.classList.contains("text") && (child.scrollHeight > child.clientHeight + 2 || child.scrollWidth > child.clientWidth + 2)) errors.push(`Text overflow: ${text}`);
      if (child.tagName === "IMG" && (!child.complete || child.naturalWidth === 0)) errors.push("Missing evidence image");
      for (const cell of child.querySelectorAll("td,th")) {
        if (cell.scrollHeight > cell.clientHeight + 2 || cell.scrollWidth > cell.clientWidth + 2) errors.push(`Table cell overflow: ${cell.textContent}`);
      }
      return errors;
    }));
    await page.screenshot({ path: join(output, `slide-${i}.png`) });
    report.push({ slide: i, issues });
  }
  await fs.writeFile(join(ROOT, ".build/copilot/slide-layout.json"), JSON.stringify(report, null, 2));
  const failures = report.filter((item) => item.issues.length);
  if (failures.length) throw new Error(JSON.stringify(failures));
  console.log(`Captured and checked ${count} browser slides.`);
} finally { await browser.close(); }
