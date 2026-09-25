import { actors, initialRefunds, threshold } from "./fixtures.mjs";

const failure = (status, code, message) => ({ status, body: { error: { code, message } } });

export function createRefundService({ seed = initialRefunds, clock = () => new Date().toISOString() } = {}) {
  let refunds = structuredClone(seed);

  function state() {
    return {
      policy: { threshold, currency: "KRW", version: "refund-policy-v1", enforced: false },
      actors: structuredClone(actors), refunds: structuredClone(refunds), events: [],
      summary: {
        totalCount: refunds.length,
        totalAmount: refunds.reduce((sum, item) => sum + item.amount, 0),
        pendingApprovalCount: 0, pendingApprovalAmount: 0,
        completedCount: refunds.filter((item) => item.status === "completed").length,
        rejectedCount: 0,
      },
    };
  }

  function handle(method, requestUrl, body = {}) {
    const url = new URL(requestUrl, "http://127.0.0.1");
    if (url.pathname === "/api/refunds") {
      return method === "GET" ? { status: 200, body: state() } : failure(405, "METHOD_NOT_ALLOWED", "GET만 지원합니다.");
    }
    if (url.pathname === "/api/demo/reset") {
      if (method !== "POST") return failure(405, "METHOD_NOT_ALLOWED", "POST만 지원합니다.");
      refunds = structuredClone(seed);
      return { status: 200, body: state() };
    }
    const match = url.pathname.match(/^\/api\/refunds\/(RF-\d+)\/(process|approve|reject)$/);
    if (!match) return failure(404, "NOT_FOUND", "요청한 경로가 없습니다.");
    if (method !== "POST") return failure(405, "METHOD_NOT_ALLOWED", "POST만 지원합니다.");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["actorId", "reason"].includes(key))) {
      return failure(400, "INVALID_REQUEST", "actorId와 reason만 지정할 수 있습니다.");
    }
    const actor = actors.find((item) => item.id === body.actorId);
    if (!actor) return failure(401, "UNKNOWN_ACTOR", "시연용 역할을 선택해 주세요.");
    const refund = refunds.find((item) => item.id === match[1]);
    if (!refund) return failure(404, "REFUND_NOT_FOUND", "환불 건이 없습니다.");
    if (match[2] !== "process") return failure(409, "CONTROL_NOT_IMPLEMENTED", "승인 워크플로가 아직 없습니다.");
    if (refund.status !== "requested") return failure(409, "INVALID_STATE", "이미 처리한 요청입니다.");
    refund.status = "completed";
    refund.requestedBy = actor.id;
    refund.decidedBy = actor.id;
    refund.updatedAt = clock();
    return { status: 200, body: { refund: structuredClone(refund), message: "환불 처리 완료 (모의 처리)" } };
  }

  return { handle };
}
