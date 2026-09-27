import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { makeSlides } from "./copilot-content.mjs";
import { scenes } from "../video/scenes.mjs";

const [verification, manifest] = await Promise.all(["03-verification.json", "manifest.json"].map(async (file) =>
  JSON.parse(await fs.readFile(new URL(`../demo/copilot-evidence/${file}`, import.meta.url), "utf8"))));
const slides = makeSlides(verification, manifest);
const text = (slide) => slide.elements.flatMap((element) => element.kind === "text" ? [element.value] : element.kind === "table" ? element.rows.flat() : []).join("\n");

test("five introductory slides follow the existing cover before the demo", () => {
  assert.equal(slides.length, 18);
  assert.equal(slides[0].videoSource, "slide-cover");
  assert.deepEqual(slides.slice(1, 6).map((slide) => slide.id), [
    "copilot-overview", "copilot-surfaces", "copilot-modes", "copilot-agent-capabilities", "copilot-agent-customization",
  ]);
  assert.equal(slides[6].videoSource, "slide-value");
  assert.equal(slides[17].videoSource, "slide-close");
  for (const [index, slide] of slides.entries()) assert.equal(slide.elements.at(-1).value, String(index + 1));
});

test("the introduction covers surfaces, modes, agent capabilities and their boundaries", () => {
  for (const surface of ["IDE", "GitHub.com", "Copilot CLI", "GitHub Copilot app", "GitHub Mobile"]) assert.ok(text(slides[2]).includes(surface));
  for (const mode of ["Ask", "Edit", "Plan", "Agent", "Interactive", "Autopilot"]) assert.ok(text(slides[3]).includes(mode));
  assert.match(text(slides[3]), /모드 선택과 도구 권한은 별도/);
  for (const feature of ["Copilot cloud agent", "Copilot code review", "/review", "Subagents", "/fleet"]) assert.ok(text(slides[4]).includes(feature));
  for (const feature of ["Custom instructions", "Custom agents", "Agent skills", "MCP", "Agentic Workflows", "Public preview"]) assert.ok(text(slides[5]).includes(feature));
  for (const slide of slides.slice(1, 6)) assert.match(slide.notes, /https:\/\/docs\.github\.com\//);
  assert.match(slides[4].notes, /제품 소개 범위/);
  assert.match(slides[5].notes, /실행한 데모가 아니다/);
});

test("the new tables and existing CXO table remain editable native elements", () => {
  assert.deepEqual(slides.flatMap((slide, index) => slide.elements.some((element) => element.kind === "table") ? [index + 1] : []), [3, 6, 16]);
  for (const table of slides.flatMap((slide) => slide.elements.filter((element) => element.kind === "table"))) {
    assert.equal(table.widths.reduce((sum, width) => sum + width, 0), table.w);
    assert.ok(table.rows.every((row) => row.length === table.widths.length));
  }
});

test("the five-minute video keeps the original slide content despite inserted slides", () => {
  const expected = new Map([
    ["slide-cover", "GitHub Copilot: 비즈니스 요청을 제품 변경으로"],
    ["slide-value", "개발 생산성은 코드 작성 다음 단계까지"],
    ["slide-policy", "경영진의 요청: 고액 환불에는 승인과 이력"],
    ["slide-scale", "이미 쓰는 GitHub를 팀의 AI 개발 기반으로"],
    ["slide-close", "실행은 Copilot이, 기준과 결정은 조직이"],
  ]);
  const references = scenes.filter((scene) => scene.source.startsWith("slide-"));
  assert.equal(references.length, expected.size);
  for (const scene of references) {
    const matched = slides.filter((slide) => slide.videoSource === scene.source);
    assert.equal(matched.length, 1);
    assert.equal(matched[0].title, expected.get(scene.source));
  }
  assert.equal(scenes.reduce((sum, scene) => sum + scene.duration, 0), 300);
});
