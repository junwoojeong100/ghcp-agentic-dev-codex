const money = (amount) => new Intl.NumberFormat("ko-KR").format(amount) + "원";
const statuses = { requested: "처리 전", pending_approval: "승인 대기", completed: "처리 완료", rejected: "반려" };
const actorSelect = document.querySelector("#actor");
const notice = document.querySelector("#notice");
let busy = false;

function text(tag, value, className) {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  return element;
}

async function request(path, body) {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status} · ${result.error.code} · ${result.error.message}`);
  return { result, status: response.status };
}

async function act(id, action) {
  if (busy) return;
  busy = true;
  notice.className = "";
  notice.textContent = "서버에서 처리 중입니다.";
  try {
    const { result, status } = await request(`/api/refunds/${id}/${action}`, { actorId: actorSelect.value });
    notice.className = "good";
    notice.textContent = `HTTP ${status} · ${result.message}`;
  } catch (error) {
    notice.className = "error";
    notice.textContent = error.message;
  } finally {
    busy = false;
    await refresh();
  }
}

async function refresh() {
  try {
    const { result: data } = await request("/api/refunds");
    if (!actorSelect.options.length) {
      for (const actor of data.actors) actorSelect.add(new Option(actor.label, actor.id));
    }
    document.querySelector("#total-count").textContent = `${data.summary.totalCount}건`;
    document.querySelector("#pending-amount").textContent = money(data.summary.pendingApprovalAmount);
    document.querySelector("#completed-count").textContent = `${data.summary.completedCount}건`;
    document.querySelector("#event-count").textContent = `${data.events.length}건`;
    document.querySelector("#run-mode").textContent = data.demoMode === "recorded-replay" ? "사전 녹화 실행 결과 재생 · 합성 데이터" : "로컬 시연용 앱 · 합성 데이터";
    const rows = document.querySelector("#refund-rows");
    rows.replaceChildren();
    for (const refund of data.refunds) {
      const row = document.createElement("tr");
      row.dataset.id = refund.id;
      const customer = document.createElement("td");
      customer.append(text("strong", refund.customer), text("small", `${refund.id} / ${refund.order}`));
      const status = document.createElement("td");
      status.append(text("span", statuses[refund.status], `badge ${refund.status}`));
      const actions = text("td", "", "actions");
      if (refund.status === "requested") {
        const button = text("button", "환불 처리");
        button.setAttribute("aria-label", `${refund.id} 환불 처리`);
        button.addEventListener("click", () => act(refund.id, "process"));
        actions.append(button);
      } else actions.append(text("span", "처리 종료", "subtle"));
      row.append(customer, text("td", money(refund.amount), "amount"), text("td", refund.reason), status, actions);
      rows.append(row);
    }
  } catch (error) {
    notice.className = "error";
    notice.textContent = `데이터 조회 실패: ${error.message}`;
  }
}

document.querySelector("#reset").addEventListener("click", async () => {
  if (busy) return;
  try {
    await request("/api/demo/reset", {});
    notice.className = "";
    notice.textContent = "합성 데이터를 초기화했습니다. 실제 환불은 실행되지 않습니다.";
    await refresh();
  } catch (error) { notice.className = "error"; notice.textContent = error.message; }
});
actorSelect.addEventListener("change", refresh);
await refresh();
if (!notice.classList.contains("error")) notice.textContent = "RF-2401: 120만 원도 현재는 승인 없이 즉시 처리할 수 있습니다.";
