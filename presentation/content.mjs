const C = { ink: "172033", muted: "637085", purple: "7652C4", green: "19734A", orange: "AD5B15", light: "F7F8FC", dark: "101523", white: "FFFFFF" };
const text = (value, x, y, w, h, size = 28, color = C.ink, bold = false) => ({ kind: "text", value, x, y, w, h, size, color, bold });
const image = (file, x, y, w, h) => ({ kind: "image", file, x, y, w, h });
const rect = (x, y, w, h, fill) => ({ kind: "rect", x, y, w, h, fill });
const line = (x, y, w, color = "D8DFEB", arrow = false) => ({ kind: "line", x, y, w, h: 0, color, arrow });
const heading = (title, subtitle) => [text(title, 74, 60, 1132, 66, 46, C.ink, true), ...(subtitle ? [text(subtitle, 76, 138, 1128, 52, 25, C.muted)] : [])];
const source = "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli";

export function makeSlides(verification, manifest) {
  if (!verification.success) throw new Error("A successful current demo verification is required before authoring evidence slides.");
  const productTests = verification.checks.find((check) => check.command.includes("test/refunds.test.mjs"));
  const acceptance = verification.checks.find((check) => check.command.some((part) => part.endsWith("refund-acceptance.test.mjs")));
  if (!productTests || !acceptance) throw new Error("Missing test counts in verification record.");
  const slides = [
    {
      background: C.dark, title: "GitHub Copilot: Agentic Development in Action",
      elements: [text("GitHub Copilot", 78, 97, 1100, 74, 58, C.white, true), text("Agentic Development\nin Action", 78, 190, 1090, 175, 66, C.white, true), text("경영진의 요청을\n검토 가능한 제품 변경으로", 82, 450, 1090, 110, 37, "C9B6F2"), text("CXO DEMO · 환불 승인과 감사", 84, 622, 1070, 28, 19, "AAB4C8")],
      notes: "오프닝: '120만 원 환불이 버튼 한 번으로 완료된다면, 우리 조직은 어디서 통제해야 할까요?' 기능 목록 대신 실제 업무의 변경 전후를 보여 준다. 본 영상은 실제 로컬 실행을 편집한 사전 녹화이며 편집 길이가 구현 시간은 아니다. 합성 데이터와 모의 역할, 실제 금전 이동 없음.",
    },
    {
      title: "승인 없이 완료되는 120만 원 환불", elements: [...heading("승인 없이 완료되는 120만 원 환불", "현재 업무 화면에서 통제의 빈틈을 먼저 확인합니다"), image("before-policy.png", 76, 217, 1128, 126), image("before-completed-row.png", 76, 376, 1128, 90), image("before-completed-metrics.png", 76, 482, 1128, 124), text("실제 결제 대신 합성 요청의 상태를 바꾸는 로컬 시연입니다", 78, 635, 1110, 34, 21, C.muted)],
      notes: "변경 전 실제 앱을 캡처했다. 김지원 역할로 RF-2401 처리 시 120만 원이 즉시 completed 상태가 되고 감사 이벤트는 0이다. 실제 금전 이동이나 실제 조직의 결함을 주장하지 않는다. 출처: demo/starter, .build/screens/before-*.png.",
    },
    {
      title: "경영진의 정책 요청", elements: [...heading("경영진의 정책 요청"), text("“100만 원 이상 환불은\n다른 담당자가 승인한 뒤 처리하고,\n결정과 차단 시도를 기록해 주세요.”", 82, 197, 1110, 245, 45, C.purple, true), line(82, 492, 1114), text("소액 고객 대응은 유지", 84, 532, 500, 44, 28, C.ink, true), text("서버의 정책과 업무 화면을 함께 변경", 84, 583, 1100, 46, 27, C.muted)],
      notes: "원문 변경 요청: demo/request.md. 경계는 100만 원 이상으로 정한다. 본 데모의 정책 요구 예시이며 법적 준수 판정이 아니다. 대기 금액을 비용 절감액이나 손실 예방액이라고 표현하지 않는다.",
    },
    {
      title: "요청부터 검토까지의 작업 전달", elements: [...heading("요청부터 검토까지의 작업 전달", "역할별 결과물을 다음 단계의 입력으로 사용합니다"),
        text("Copilot 계획", 80, 259, 209, 56, 31, C.purple, true), text("Copilot 구현", 368, 259, 209, 56, 31, C.purple, true), text("로컬 검증", 662, 259, 200, 56, 31, C.green, true), text("Copilot 검토", 944, 259, 255, 56, 31, C.purple, true),
        line(299, 286, 47, C.purple, true), line(585, 286, 54, C.purple, true), line(872, 286, 51, C.purple, true),
        text("계획서\n완료 기준", 84, 332, 215, 91, 27, C.muted), text("UI와 업무 API\n테스트와 문서", 372, 332, 240, 91, 27, C.muted), text("테스트 기록\n변경 diff", 664, 332, 225, 91, 27, C.muted), text("지적 사항\n남은 위험", 947, 332, 245, 91, 27, C.muted),
        rect(79, 484, 510, 115, "EEE8FA"), text("사람: 구현 범위 승인", 102, 515, 460, 53, 30, C.purple, true), rect(662, 484, 536, 115, "E8F3EC"), text("사람: 적용 및 출시 판단", 683, 515, 500, 53, 30, C.green, true), text("인계 방식은 명시적 파일 전달이며, A2A 프로토콜 연결은 사용하지 않습니다", 82, 631, 1115, 43, 21, C.muted)],
      notes: `실제 구현은 GitHub Copilot CLI --agent를 순차 호출하는 로컬 스크립트다. 로컬 스크립트가 테스트를 실행하며, 검증 단계에 별도 AI 에이전트가 있다고 주장하지 않는다. 자율 에이전트 네트워크나 특정 A2A 프로토콜 구현이 아니다. 자동 리허설 수락은 simulated-rehearsal이고 실제 발표자는 직접 범위를 승인한다. 공식 출처: ${source}`,
    },
    {
      title: "Copilot이 바꾸는 제품의 표면", elements: [...heading("Copilot이 바꾸는 제품의 표면", "하나의 요청으로 연결된 변경을 검토합니다"), text("업무 화면", 82, 229, 240, 53, 35, C.purple, true), text("승인 요청·승인·반려와 역할별 안내", 400, 232, 788, 58, 28), line(82, 311, 1118), text("서버의 통제", 82, 347, 300, 53, 35, C.purple, true), text("금액 경계, 자기 승인 금지, 상태 전이", 400, 350, 788, 58, 28), line(82, 429, 1118), text("테스트와 문서", 82, 465, 300, 53, 35, C.purple, true), text("기존 동작, 예외 처리, 운영 한계", 400, 468, 788, 58, 28), text("외부 결제·인증·데이터베이스와 배포는 이번 변경에서 제외합니다", 84, 606, 1100, 46, 23, C.muted)],
      notes: `실제 변경 파일: ${verification.changedFiles.join(", ")}. 수정 범위는 계획 수락 전 정했고, 파일 해시로 범위를 확인했다. 로컬 스크립트의 허용 목록은 운영 보안 경계의 완전성을 증명하지 않는다. 실제 구현 기록: demo/fallback/02-implementation.md 및 change.diff. ${source}`,
    },
    {
      title: "120만 원은 승인 대기에 남습니다", elements: [...heading("120만 원은 승인 대기에 남습니다", "버튼 동작과 서버의 처리 결과가 함께 바뀝니다"), image("after-policy.png", 76, 211, 1128, 126), image("after-pending-row.png", 76, 362, 1128, 107), image("after-pending-metrics.png", 76, 496, 1128, 126), text("HTTP 202 · 승인 전에는 completed 상태로 전환하지 않음", 82, 644, 1110, 37, 22, C.green, true)],
      notes: "실제 로컬 API에 승인 요청을 보낸 뒤 캡처했다. 요청 건 RF-2401, 금액 1,200,000원, 요청자 cs-kim. pendingApprovalAmount는 실제 현재 배열의 합계이다. 예방한 손실이나 생산성 지표가 아니다.",
    },
    {
      title: "자기 승인은 서버가 차단합니다", elements: [...heading("자기 승인은 서버가 차단합니다"), text("403", 80, 185, 420, 150, 120, C.orange, true), text("요청자와 승인자를 분리", 504, 214, 680, 70, 36, C.ink, true), text("검증용 버튼으로 실제 API의\n거부 결과를 확인합니다", 507, 308, 680, 103, 29, C.muted), image("after-blocked-notice.png", 77, 454, 1127, 76), image("after-blocked-row.png", 77, 554, 1127, 104)],
      notes: "동일 actorId=cs-kim의 approve 요청을 실제로 보내 HTTP 403/SELF_APPROVAL을 확인했다. '자기 승인 차단 확인' 버튼은 통제 검증용이며 정상 승인 권한이 있는 것처럼 제시하지 않는다. 역할 선택은 실제 사용자 인증이 아니다.",
    },
    {
      title: "승인과 차단 시도가 이력에 남습니다", elements: [...heading("승인과 차단 시도가 이력에 남습니다", "다른 운영 승인자가 결정한 뒤 상태와 이력을 함께 확인합니다"), image("after-approved-row.png", 78, 219, 1124, 89), image("after-audit.png", 78, 344, 1124, 262), text("누가 · 어떤 환불에 · 무엇을 했는가 · 허용 또는 차단 사유", 80, 635, 1120, 41, 24, C.purple, true)],
      notes: "김지원 요청, 김지원 자기 승인 차단, 박민서 승인이라는 실제 메모리 이벤트를 캡처했다. 실제 계정 인증 또는 변경 불가능한 영구 감사 저장소가 아니다. 서버 재시작 및 데모 초기화 시 사라진다. 배포 설계에서는 인증, 영구 저장, 결제 경계, 동시성 등을 별도로 검토해야 한다.",
    },
    {
      title: "테스트가 놓친 부분을 드러냅니다", elements: [...heading("테스트가 놓친 부분을 드러냅니다", "최초 생성 결과를 그대로 승인하지 않습니다"), text("첫 독립 검증", 84, 230, 455, 51, 31, C.orange, true), text("감사 사유 누락 발견", 84, 302, 520, 87, 41, C.ink, true), text("Copilot 보완 후 다시 검증", 84, 406, 560, 63, 27, C.muted), line(649, 218, 0), text(`${productTests.passed} + ${acceptance.passed}`, 707, 222, 490, 111, 80, C.green, true), text("제품 테스트 + 독립 인수 테스트", 708, 359, 495, 84, 28, C.ink, true), text("로컬 실행 기록과 diff를\n읽기 전용 검토 역할에 전달", 709, 468, 488, 104, 27, C.muted), text("테스트 통과는 운영 안전성이나 출시 승인과 다릅니다", 84, 630, 1110, 43, 25, C.purple, true)],
      notes: `최초 외부 인수 검증은 감사 reason=null로 실패했고 문자열 정규화 후 빈 값 검사에서도 실패했다. 의미 있는 사유를 남기도록 구현과 테스트를 보완한 뒤 최종 검증했다. 최종 제품 ${productTests.passed}/${productTests.tests}, 독립 인수 ${acceptance.passed}/${acceptance.tests}, git diff --check exit=0. 출처: demo/fallback/03-first-verification.json, 03-second-verification.json, 03-verification.json. 실제 재현 환경: ${manifest.copilot}, ${manifest.node}, ${manifest.platform}. GitHub Actions 실행 결과가 아니다.`,
    },
    {
      title: "사람에게 남는 결정", elements: [...heading("사람에게 남는 결정"), text("구현 전", 82, 225, 230, 61, 32, C.purple, true), text("정책의 의미, 완료 기준, 변경 범위 확인", 356, 228, 838, 71, 30), line(82, 331, 1115), text("구현 후", 82, 371, 230, 61, 32, C.purple, true), text("diff와 테스트, 검토 의견, 남은 위험 확인", 356, 374, 838, 71, 30), line(82, 476, 1115), text("출시 판단", 82, 521, 230, 61, 32, C.green, true), text("HOLD · 운영 적용은 별도 승인", 356, 524, 838, 71, 31, C.green, true), text("영상의 자동 리허설 수락은 실제 사람의 승인이 아닙니다", 84, 634, 1108, 39, 22, C.muted)],
      notes: "계획 수락과 출시 판단은 별개다. 리허설의 kind는 simulated-rehearsal로 명시했고 최종 상태는 hold다. --by는 입력 라벨이지 인증된 결재가 아니다. 본 데모는 PR 생성·병합·배포를 하지 않는다. 실제 발표에서는 발표자가 계획을 읽고 승인 명령을 직접 실행한다.",
    },
    {
      title: "첫 파일럿의 선택 기준", elements: [...heading("첫 파일럿의 선택 기준", "운영 결제 엔진 대신, 되돌릴 수 있는 비운영 변경부터 시작합니다"), text("명확한 완료 기준", 84, 235, 540, 57, 34, C.purple, true), text("정책 경계와 실패 조건을\n테스트로 확인할 수 있는가", 86, 313, 532, 106, 30), text("제한된 적용 범위", 696, 235, 498, 57, 34, C.purple, true), text("합성 데이터, 최소 권한,\n명시적 승인과 복구 경로가 있는가", 698, 313, 500, 135, 30), line(84, 498, 1110), text("후보: 승인 분기, 내부 운영 화면, 회귀 테스트 보강", 86, 538, 1108, 52, 29, C.ink, true), text("리드타임·재작업·검토 부담은 도입 전후 같은 완료 기준으로 측정", 86, 611, 1108, 44, 23, C.muted)],
      notes: "이 데모를 근거로 시간 절감률이나 비용 절감액을 주장하지 않는다. 실제 결제·인증·영구 저장 설계는 별도 보안 및 운영 검토가 필요하다. 파일럿 지표는 향후 측정 제안이지 이 세션의 검증 성과가 아니다.",
    },
    {
      title: "요청에서 검토 가능한 제품 변경까지", background: C.dark,
      elements: [text("GitHub Copilot", 83, 97, 1090, 69, 49, C.white, true), text("하나의 업무 요청에서\n검토 가능한 제품 변경까지", 80, 240, 1115, 190, 60, C.white, true), text("작업은 에이전트가 수행하고,\n범위와 출시는 사람이 결정합니다", 84, 499, 1100, 122, 36, "C9B6F2")],
      notes: "마무리: 기능의 개수보다 조직의 어느 변경에 적용하고 어디에서 사람의 결정을 유지할지 질문한다. 경영 정책, 실제 UI/API 변화, 검증, 사람의 통제라는 연결을 기억하게 한다. 특정 프로토콜 또는 자동 운영 배포의 시연으로 확대 해석하지 않는다.",
    },
    {
      title: "부록: 서로 다른 세 가지 개념", elements: [...heading("부록: 서로 다른 세 가지 개념"), {kind:"table",x:80,y:208,w:1120,h:356,widths:[290,550,280],rows:[
        ["개념", "의미", "이번 시연"],
        ["GitHub 개발 흐름", "코드 변경과 검증·검토의 연결", "CLI 역할과 로컬 검증"],
        ["Copilot Studio", "에이전트와 업무 자동화 제작 환경", "사용하지 않음"],
        ["A2A 프로토콜", "독립 에이전트 간 통신 규약", "구현하지 않음"],
      ]}, text("이 세션의 Agent-to-Agent는 역할별 작업 결과를 전달하는 협업 설계입니다", 83, 608, 1114, 64, 24, C.purple, true)],
      notes: `GitHub Copilot CLI 역할 실행: ${source}\nCopilot Studio 공식 개요: https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-what-is-copilot-studio\nA2A 규격: https://a2a-protocol.org/latest/specification/\nCopilot Studio의 일부 환경이 GitHub Copilot harness를 사용하더라도 제품의 제작·운영 워크플로와 이 로컬 개발 데모를 같은 것으로 취급하지 않는다. GitHub Copilot code review 제품과도 구분한다.`,
    },
  ];
  return slides.map((slide, index) => ({ background: C.light, ...slide, elements: [...slide.elements, text(String(index + 1), 1200, 679, 36, 23, 14, slide.background === C.dark ? "8994A9" : "8A95A8")] }));
}
