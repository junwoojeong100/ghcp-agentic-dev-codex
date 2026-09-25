import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.DEMO_APP_ROOT) throw new Error("Set DEMO_APP_ROOT to the app to verify.");
const root = resolve(process.env.DEMO_APP_ROOT);
const { createRefundService } = await import(pathToFileURL(resolve(root, "src/refunds.mjs")));
const { createDemoServer } = await import(pathToFileURL(resolve(root, "src/server.mjs")));
const { initialRefunds } = await import(pathToFileURL(resolve(root, "src/fixtures.mjs")));
const state = (service) => service.handle("GET", "/api/refunds").body;
const action = (service, id, name, actorId, extra = {}) => service.handle("POST", `/api/refunds/${id}/${name}`, { actorId, ...extra });
const pending = () => {
  const service = createRefundService({ clock: () => "2026-09-26T00:00:00.000Z" });
  action(service, "RF-2401", "process", "cs-kim");
  return service;
};
const expectError = (response, status, code) => {
  assert.equal(response.status, status);
  assert.equal(response.body.error.code, code);
  assert.equal(typeof response.body.error.message, "string");
};

test("AC-1: policy, fixture values and total amount remain explicit", () => {
  const data = state(createRefundService());
  assert.equal(data.policy.enforced, true);
  assert.equal(data.policy.threshold, 1_000_000);
  assert.equal(data.policy.currency, "KRW");
  assert.deepEqual(data.refunds, initialRefunds);
  assert.equal(data.summary.totalCount, 4);
  assert.equal(data.summary.totalAmount, 2_475_000);
});

for (const amount of [35_000, 999_999, 1_000_000, 1_200_000]) {
  test(`AC-1: threshold behavior at ${amount} KRW`, () => {
    const seed = structuredClone(initialRefunds);
    seed[0].amount = amount;
    const service = createRefundService({ seed });
    const result = action(service, "RF-2401", "process", "cs-kim");
    assert.equal(result.status, amount < 1_000_000 ? 200 : 202);
    assert.equal(result.body.refund.status, amount < 1_000_000 ? "completed" : "pending_approval");
    assert.equal(result.body.refund.amount, amount);
    assert.equal(result.body.refund.requestedBy, "cs-kim");
    assert.equal(state(service).summary.pendingApprovalAmount, amount < 1_000_000 ? 0 : amount);
  });
}

test("AC-2: a pending refund cannot be completed by requesting again", () => {
  const service = pending();
  expectError(action(service, "RF-2401", "process", "ops-park"), 409, "INVALID_STATE");
  assert.equal(state(service).refunds[0].status, "pending_approval");
  assert.equal(state(service).refunds[0].requestedBy, "cs-kim");
  assert.equal(state(service).summary.completedCount, 0);
});

for (const name of ["approve", "reject"]) {
  test(`AC-3: self ${name} is rejected by the service`, () => {
    const service = pending();
    expectError(action(service, "RF-2401", name, "cs-kim", { reason: "확인 필요" }), 403, "SELF_APPROVAL");
    assert.equal(state(service).refunds[0].status, "pending_approval");
  });
  test(`AC-3: other support actor cannot ${name}`, () => {
    expectError(action(pending(), "RF-2401", name, "cs-lee", { reason: "확인 필요" }), 403, "APPROVER_REQUIRED");
  });
}

test("AC-3: initiation is limited to support roles, consistently with the UI", () => {
  const service = createRefundService();
  for (const id of ["RF-2401", "RF-2402"]) {
    expectError(action(service, id, "process", "ops-park"), 403, "REQUESTER_REQUIRED");
    const data = state(service);
    assert.equal(data.refunds.find(item => item.id === id).status, "requested");
    assert.equal(data.events.at(-1).outcome, "blocked");
    assert.equal(data.events.at(-1).actorId, "ops-park");
  }
});

test("AC-4: a different approver completes exactly once", () => {
  const service = pending();
  const result = action(service, "RF-2401", "approve", "ops-park");
  assert.equal(result.status, 200);
  assert.equal(result.body.refund.status, "completed");
  assert.equal(result.body.refund.decidedBy, "ops-park");
  assert.equal(result.body.refund.requestedBy, "cs-kim");
  for (const name of ["approve", "process", "reject"]) {
    expectError(action(service, "RF-2401", name, "ops-park", { reason: "중복 시도" }), 409, "INVALID_STATE");
  }
  assert.equal(state(service).summary.completedCount, 1);
  assert.equal(state(service).summary.pendingApprovalCount, 0);
  assert.equal(state(service).summary.pendingApprovalAmount, 0);
  assert.equal(state(service).events.filter((event) => event.action === "approve" && event.outcome === "allowed").length, 1);
});

test("AC-4: rejection requires a reason and is terminal", () => {
  const service = pending();
  for (const reason of [undefined, "", "   ", "x".repeat(201), 123]) {
    expectError(action(service, "RF-2401", "reject", "ops-park", { reason }), 400, "INVALID_REASON");
    assert.equal(state(service).refunds[0].status, "pending_approval");
  }
  const result = action(service, "RF-2401", "reject", "ops-park", { reason: "계약 조건 확인 필요" });
  assert.equal(result.status, 200);
  assert.equal(result.body.refund.status, "rejected");
  assert.equal(state(service).summary.rejectedCount, 1);
  assert.equal(state(service).summary.pendingApprovalAmount, 0);
  expectError(action(service, "RF-2401", "approve", "ops-park"), 409, "INVALID_STATE");
});

test("AC-4: decisions cannot precede an approval request", () => {
  expectError(action(createRefundService(), "RF-2401", "approve", "ops-park"), 409, "INVALID_STATE");
});

test("AC-5: audit records preserve actor, amount, outcome, order and timestamp", () => {
  const service = pending();
  action(service, "RF-2401", "approve", "cs-kim");
  action(service, "RF-2401", "approve", "ops-park");
  const events = state(service).events;
  assert.equal(events.length, 3);
  assert.deepEqual(events.map(({ action, outcome }) => [action, outcome]), [["process", "allowed"], ["approve", "blocked"], ["approve", "allowed"]]);
  assert.deepEqual(events.map((event) => event.actorId), ["cs-kim", "cs-kim", "ops-park"]);
  assert.equal(new Set(events.map((event) => event.id)).size, 3);
  for (const event of events) {
    assert.equal(event.refundId, "RF-2401");
    assert.equal(event.amount, 1_200_000);
    assert.equal(event.timestamp, "2026-09-26T00:00:00.000Z");
    assert.equal(typeof event.reason, "string");
    assert.ok(event.reason.length);
  }
});

test("AC-6: executive metrics derive from actual pending and completed state", () => {
  const service = pending();
  action(service, "RF-2403", "process", "cs-kim");
  action(service, "RF-2402", "process", "cs-kim");
  const data = state(service);
  assert.equal(data.summary.pendingApprovalCount, 2);
  assert.equal(data.summary.pendingApprovalAmount, 2_200_000);
  assert.equal(data.summary.completedCount, 1);
  assert.equal(data.summary.totalAmount, 2_475_000);
});

test("AC-7: actor and amount spoofing cannot bypass the policy", () => {
  const service = createRefundService();
  expectError(action(service, "RF-2401", "process", "cs-kim", { amount: 1 }), 400, "INVALID_REQUEST");
  const attempt = state(service).events.at(-1);
  assert.ok(attempt, "An identified actor's amount-tampering attempt must be audited.");
  assert.equal(attempt.outcome, "blocked");
  assert.equal(attempt.actorId, "cs-kim");
  assert.equal(attempt.amount, 1_200_000);
  assert.ok(attempt.reason.trim());
  expectError(action(service, "RF-2401", "process", "cs-kim", { extra: true }), 400, "INVALID_REQUEST");
  assert.equal(state(service).events.length, 2);
  expectError(action(service, "RF-2401", "process", "unknown"), 401, "UNKNOWN_ACTOR");
  expectError(action(service, "RF-9999", "process", "cs-kim"), 404, "REFUND_NOT_FOUND");
  assert.equal(state(service).refunds[0].status, "requested");
  assert.equal(state(service).refunds[0].amount, 1_200_000);
});

test("AC-7: external mutation cannot change refunds, actors or audit entries", () => {
  const service = pending();
  const snapshot = state(service);
  snapshot.refunds[0].amount = 1;
  snapshot.events[0].actorId = "spoof";
  snapshot.actors[0].role = "approver";
  const actual = state(service);
  assert.equal(actual.refunds[0].amount, 1_200_000);
  assert.equal(actual.events[0].actorId, "cs-kim");
  assert.equal(actual.actors[0].role, "support");
});

test("AC-8: reset restores state and event sequence while instances stay isolated", () => {
  const service = pending();
  const firstId = state(service).events[0].id;
  assert.equal(state(createRefundService()).events.length, 0);
  const result = service.handle("POST", "/api/demo/reset", {});
  assert.deepEqual(result.body.refunds, initialRefunds);
  assert.deepEqual(result.body.events, []);
  assert.equal(result.body.summary.pendingApprovalAmount, 0);
  action(service, "RF-2401", "process", "cs-kim");
  assert.equal(state(service).events[0].id, firstId);
});

test("HTTP integration: real routes, assets, policy, blocked and approved requests", async (t) => {
  const server = createDemoServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const [path, type] of [["/", "text/html"], ["/app.mjs", "text/javascript"], ["/styles.css", "text/css"]]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").startsWith(type));
  }
  const post = (path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  assert.equal((await post("/api/refunds/RF-2401/process", { actorId: "cs-kim" })).status, 202);
  assert.equal((await post("/api/refunds/RF-2401/approve", { actorId: "cs-kim" })).status, 403);
  assert.equal((await post("/api/refunds/RF-2401/approve", { actorId: "ops-park" })).status, 200);
  assert.equal((await post("/api/refunds/RF-2401/approve", { actorId: "ops-park" })).status, 409);
  const data = await (await fetch(base + "/api/refunds")).json();
  assert.equal(data.refunds[0].status, "completed");
  assert.equal(data.summary.completedCount, 1);
  const badJson = await fetch(base + "/api/demo/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
  assert.equal(badJson.status, 400);
  assert.equal((await badJson.json()).error.code, "INVALID_JSON");
  const origin = await fetch(base + "/api/demo/reset", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://unrelated.example" }, body: "{}" });
  assert.equal(origin.status, 403);
});
