async (page) => {
  const base = "/Users/junwoojeong/GitHub/ghcp-agentic-dev-codex/.build";
  const results = [];
  async function record(name, perform) {
    const context = await page.context().browser().newContext({
      viewport: { width: 1440, height: 900 },
      recordVideo: { dir: base + "/video/raw", size: { width: 1440, height: 900 } },
    });
    const demo = await context.newPage();
    await demo.goto("http://127.0.0.1:4274");
    await demo.locator("#actor option").first().waitFor({ state: "attached" });
    const video = demo.video();
    try {
      await perform(demo);
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
  async function shot(demo, name, selector) {
    if (selector) await demo.locator(selector).screenshot({ path: base + "/screens/" + name + ".png" });
    else await demo.screenshot({ path: base + "/screens/" + name + ".png" });
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
