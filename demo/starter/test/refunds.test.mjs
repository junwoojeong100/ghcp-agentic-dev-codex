import test from "node:test";
import assert from "node:assert/strict";
import { createRefundService } from "../src/refunds.mjs";

test("GET returns four synthetic refunds and their original amounts", () => {
  const service = createRefundService();
  const response = service.handle("GET", "/api/refunds");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.refunds.map(({ id, amount }) => [id, amount]), [["RF-2401", 1200000], ["RF-2402", 35000], ["RF-2403", 1000000], ["RF-2404", 240000]]);
  assert.equal(response.body.summary.totalAmount, 2475000);
});

test("low-value refunds preserve immediate simulated completion", () => {
  const response = createRefundService().handle("POST", "/api/refunds/RF-2402/process", { actorId: "cs-kim" });
  assert.equal(response.status, 200);
  assert.equal(response.body.refund.status, "completed");
});

test("responses do not expose mutable internal state", () => {
  const service = createRefundService();
  service.handle("GET", "/api/refunds").body.refunds[0].amount = 1;
  assert.equal(service.handle("GET", "/api/refunds").body.refunds[0].amount, 1200000);
});

test("unknown actor and unsupported fields are rejected", () => {
  const service = createRefundService();
  assert.equal(service.handle("POST", "/api/refunds/RF-2401/process", { actorId: "nobody" }).status, 401);
  assert.equal(service.handle("POST", "/api/refunds/RF-2401/process", { actorId: "cs-kim", amount: 1 }).status, 400);
});

test("routes and methods are checked explicitly", () => {
  const service = createRefundService();
  assert.equal(service.handle("GET", "/missing").status, 404);
  assert.equal(service.handle("POST", "/api/refunds", {}).status, 405);
  assert.equal(service.handle("POST", "/api/refunds/RF-9999/process", { actorId: "cs-kim" }).status, 404);
});

test("processing the same request twice cannot complete it twice", () => {
  const service = createRefundService();
  service.handle("POST", "/api/refunds/RF-2402/process", { actorId: "cs-kim" });
  assert.equal(service.handle("POST", "/api/refunds/RF-2402/process", { actorId: "cs-kim" }).status, 409);
  assert.equal(service.handle("GET", "/api/refunds").body.summary.completedCount, 1);
});

test("demo reset and separate service instances isolate state", () => {
  const service = createRefundService();
  service.handle("POST", "/api/refunds/RF-2402/process", { actorId: "cs-kim" });
  assert.equal(createRefundService().handle("GET", "/api/refunds").body.summary.completedCount, 0);
  service.handle("POST", "/api/demo/reset", {});
  assert.equal(service.handle("GET", "/api/refunds").body.summary.completedCount, 0);
});
