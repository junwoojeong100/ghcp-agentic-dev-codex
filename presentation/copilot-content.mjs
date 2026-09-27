const C = { ink: "172033", muted: "637085", accent: "7652C4", green: "19734A", orange: "AD5B15", light: "F7F8FC", dark: "101523", white: "FFFFFF" };
const text = (value, x, y, w, h, size = 28, color = C.ink, bold = false) => ({ kind: "text", value, x, y, w, h, size, color, bold });
const image = (file, x, y, w, h) => ({ kind: "image", file, x, y, w, h });
const line = (x, y, w, color = "D8DFEB", arrow = false) => ({ kind: "line", x, y, w, h: 0, color, arrow });
const heading = (title, subtitle) => [text(title, 74, 55, 1132, 76, 43, C.ink, true), ...(subtitle ? [text(subtitle, 76, 140, 1128, 59, 25, C.muted)] : [])];
const docs = "https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli";
const permissions = "https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools";
const instructions = "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions";
const reviewDocs = "https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/agentic-code-review";
const policyDocs = "https://docs.github.com/en/copilot/concepts/enterprise/policies";
const overviewDocs = "https://docs.github.com/en/copilot/get-started/about-github-copilot";
const ideDocs = "https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide";
const appDocs = "https://docs.github.com/en/copilot/concepts/agents/github-copilot-app";
const mobileDocs = "https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-mobile";
const cloudDocs = "https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent";
const autopilotDocs = "https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot";
const fleetDocs = "https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/speed-up-task-completion";
const customAgentDocs = "https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents";
const skillsDocs = "https://docs.github.com/en/copilot/concepts/agents/about-agent-skills";
const mcpDocs = "https://docs.github.com/en/copilot/concepts/context/mcp";
const automationDocs = "https://docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows";
const evidence = "demo/copilot-evidence";

export function makeSlides(verification, manifest) {
  if (!verification.success || manifest.kind !== "actual-copilot-pty-recording" || manifest.approvalCount < 1) throw new Error("CXO slides require verified code and a real GitHub Copilot recording with native approvals.");
  const product = verification.checks.find((check) => check.command.includes("test/refunds.test.mjs"));
  const acceptance = verification.checks.find((check) => check.command.some((part) => part.endsWith("refund-acceptance.test.mjs")));
  if (!product || !acceptance) throw new Error("Missing actual test counts.");
  const slides = [
    {
      videoSource: "slide-cover",
      title: "GitHub Copilot: 비즈니스 요청을 제품 변경으로", background: C.dark,
      elements: [text("GitHub Copilot", 78, 81, 1110, 89, 62, C.white, true), text("비즈니스 요청을\n검증 가능한 제품 변경으로", 78, 229, 1120, 195, 61, C.white, true), text("개발 실행력 · 검토 근거 · 조직의 통제권", 83, 497, 1104, 63, 35, "D7C3FF"), text("CXO BRIEFING  |  실제 Copilot CLI 에이전트 데모", 84, 619, 1110, 35, 23, "BAC4D4")],
      notes: `대상은 CXO 고객이다. 기능 목록이 아니라 사업 정책을 실제 동작하는 제품 변경으로 연결하는 능력을 보여 준다. 질문: '정책이 바뀌었을 때, 서비스는 얼마나 빠르고 검토 가능하게 바뀔 수 있을까요?' 실제 GitHub Copilot CLI 프로세스의 원본 PTY 출력을 터미널에 전달해 실시간 녹화했다. 재구성한 CLI 모형이 아니다. 합성 데이터이며 영상의 5분은 개발 소요 시간이 아니다. 출처: ${docs}; ${evidence}/manifest.json.`,
    },
    {
      id: "copilot-overview", title: "GitHub Copilot은 무엇인가",
      elements: [
        ...heading("GitHub Copilot은 무엇인가", "코드를 이해하고 작성하며, 검토와 작업 실행까지 돕는 AI 개발 도우미"),
        text("작성·이해 지원", 83, 239, 340, 58, 35, C.accent, true),
        text("코드 자동 완성\n코드베이스 질문·설명\n수정 방향과 코드 제안", 85, 336, 340, 148, 28),
        text("에이전트 실행", 477, 239, 340, 58, 35, C.accent, true),
        text("목표와 요구사항을 받아\n계획·파일 수정·테스트\n리뷰까지 작업을 수행", 479, 336, 340, 148, 28),
        text("GitHub 맥락 활용", 871, 239, 334, 58, 34, C.accent, true),
        text("저장소·코드 이력\n이슈·Pull Request\n팀의 지침과 도구 연결", 873, 336, 332, 148, 28),
        line(83, 535, 1113),
        text("특정 모델 하나가 아니라, 개발 도구와 작업 흐름을 연결하는 제품", 84, 575, 1116, 53, 29, C.ink, true),
        text("결과 검토와 병합·출시 판단은 사람이 유지합니다", 85, 644, 1109, 34, 23, C.muted),
      ],
      notes: `소개 1/5. GitHub Copilot은 개발자가 소프트웨어를 이해·작성·출시하도록 돕는 AI assistant다. 자동 완성과 대화형 도움에 더해, 목표를 받고 여러 단계의 작업을 수행하는 에이전트 기능을 제공한다. 모델, 서피스, 모드, 에이전트 기능은 서로 다른 축이다. 특정 모델 하나나 Microsoft 365 Copilot/Copilot Studio와 같은 제품이라고 설명하지 않는다. 사용 가능 기능은 플랜, 클라이언트와 조직 정책에 따라 다르다. 2026-09-26 공식 문서 확인. 출처: ${overviewDocs}.`,
    },
    {
      id: "copilot-surfaces", title: "어디서 사용하는가: 주요 서피스",
      elements: [
        ...heading("어디서 사용하는가: 주요 서피스", "서피스는 Copilot을 사용하는 화면·도구를 뜻합니다"),
        { kind: "table", x: 78, y: 216, w: 1124, h: 396, widths: [330, 324, 470], rows: [
          ["서피스", "사용하는 자리", "대표적인 활용"],
          ["IDE", "VS Code·JetBrains 등", "코드 완성·대화·로컬 에이전트"],
          ["GitHub.com", "저장소 협업", "Chat·클라우드 위임·PR 리뷰"],
          ["Copilot CLI", "터미널", "코드 수정·명령·테스트 실행"],
          ["GitHub Copilot app", "데스크톱 작업 공간", "여러 에이전트 세션·이슈·PR 관리"],
          ["GitHub Mobile", "이동 중 확인", "코드 질문·저장소·PR 확인"],
        ] },
        text("서피스마다 지원 기능이 다릅니다 · 플랜·IDE 버전·조직 정책에 따라 사용 범위 확인", 83, 639, 1116, 40, 21, C.muted),
      ],
      notes: `소개 2/5. IDE, GitHub.com, 터미널, 데스크톱 앱, 모바일을 구분한다. IDE에는 VS Code, Visual Studio, JetBrains IDEs, Xcode 등이 있지만 모든 기능을 동일하게 제공하는 것은 아니다. GitHub Copilot app은 CLI 기반의 에이전트 중심 데스크톱 앱으로 병렬 세션과 GitHub 작업을 조율한다. Mobile은 코드 질문·저장소 탐색·PR 확인을 소개하며 로컬 코드 실행 환경이라고 말하지 않는다. 이번 데모에서 실제 보여 주는 서피스는 Copilot CLI다. 2026-09-26 확인. 출처: ${ideDocs}; ${docs}; ${appDocs}; ${mobileDocs}; ${cloudDocs}.`,
    },
    {
      id: "copilot-modes", title: "작업에 맞춰 모드와 자율성을 선택합니다",
      elements: [
        ...heading("작업에 맞춰 모드와 자율성을 선택합니다", "서피스는 ‘어디서’, 모드는 ‘어떻게 함께 일하는가’의 차이입니다"),
        text("IDE의 주요 모드", 83, 223, 537, 48, 31, C.accent, true),
        text("CLI · Copilot app", 674, 223, 528, 48, 31, C.accent, true),
        text("Ask", 85, 291, 158, 43, 29, C.ink, true),
        text("질문·설명·코드 제안\n결과를 보고 직접 판단", 253, 291, 365, 69, 25),
        text("Edit*", 85, 370, 158, 43, 29, C.ink, true),
        text("선택한 파일을 중심으로 수정\n제안한 변경을 수락·거부", 253, 370, 365, 69, 25),
        text("Plan", 85, 449, 158, 43, 29, C.ink, true),
        text("요구사항·구현 계획을 정리\n확인 후 구현 단계로 전환", 253, 449, 365, 69, 25),
        text("Agent", 85, 528, 158, 43, 29, C.ink, true),
        text("필요한 파일·도구를 선택\n수정·실행·검증을 반복", 253, 528, 365, 69, 25),
        text("Interactive", 676, 291, 198, 43, 27, C.ink, true),
        text("대화하며 작업을 진행\n필요한 지점에서 방향 조정", 884, 291, 320, 69, 24),
        text("Plan", 676, 400, 198, 43, 29, C.ink, true),
        text("계획을 먼저 검토\n수락 후 구현으로 전환", 884, 400, 320, 69, 24),
        text("Autopilot", 676, 509, 198, 43, 28, C.ink, true),
        text("명확한 목표를 연속 수행\n권한·중단 조건을 사전 설정", 884, 509, 320, 69, 24),
        text("* Edit 지원은 IDE·버전별 확인 · 모드 선택과 도구 권한은 별도 설정", 84, 619, 1113, 30, 20, C.muted),
        text("이번 데모: CLI의 Plan → Interactive, 일회성 도구 승인", 84, 654, 1113, 30, 22, C.green, true),
      ],
      notes: `소개 3/5. IDE의 대표 모드 Ask·Plan·Agent와 선택 파일 중심의 Edit를 소개한다. 현재 VS Code/JetBrains 모드 선택기와 별도 Copilot Edits 지원은 IDE 및 버전에 따라 다르므로 네 가지가 모든 환경에 항상 표시된다고 주장하지 않는다. CLI와 Copilot app은 Interactive·Plan·Autopilot 세션 모드를 제공한다. CLI의 -p는 비대화형 호출 방식으로, 별도의 에이전트 역할이나 서피스가 아니다. Autopilot은 다음 단계를 자동으로 이어가는 방식이지 Cloud agent로 원격 위임하는 기능이 아니다. 모드와 권한은 별도이며, 제한된 권한에서 승인이 필요한 행동은 거부될 수 있다. 전체 권한을 권장하는 데모가 아니다. 2026-09-26 확인. 출처: ${ideDocs}; ${appDocs}; ${autopilotDocs}; ${permissions}.`,
    },
    {
      id: "copilot-agent-capabilities", title: "에이전트가 수행하는 주요 개발 작업",
      elements: [
        ...heading("에이전트가 수행하는 주요 개발 작업", "직접 함께 작업하거나, 맡겨 두고 결과를 검토할 수 있습니다"),
        text("로컬 구현·검증", 83, 222, 536, 48, 32, C.accent, true),
        text("Agent mode · Copilot CLI", 85, 278, 532, 34, 23, C.muted),
        text("코드를 수정하고 명령·테스트를 실행\n결과에 따라 보완", 85, 326, 532, 91, 27),
        text("클라우드 작업 위임", 674, 222, 529, 48, 32, C.accent, true),
        text("Copilot cloud agent", 676, 278, 526, 34, 23, C.muted),
        text("원격에서 조사·계획·브랜치 변경\n준비된 결과를 PR로 검토", 676, 326, 526, 91, 27),
        line(83, 432, 1113),
        text("코드 리뷰", 83, 461, 536, 48, 32, C.accent, true),
        text("Copilot code review · CLI /review", 85, 517, 532, 34, 23, C.muted),
        text("변경 코드의 문제와 개선점을 분석\n개발자가 검토할 근거를 제공", 85, 561, 532, 82, 26),
        text("하위 에이전트·병렬 실행", 674, 461, 529, 48, 31, C.accent, true),
        text("Subagents · CLI /fleet", 676, 517, 526, 34, 23, C.muted),
        text("독립 작업을 나누어 맡기고\n가능한 부분은 병렬로 실행", 676, 561, 526, 82, 26),
        text("로컬 Agent ≠ 클라우드 위임 · AI 리뷰 ≠ 사람의 승인", 84, 657, 1114, 30, 21, C.green, true),
      ],
      notes: `소개 4/5. Cloud agent는 GitHub Actions 기반 원격 개발 환경에서 조사·계획·코드 변경을 진행하고 PR로 검토를 요청할 수 있다. 로컬 IDE Agent mode와 같은 실행 위치가 아니다. Copilot code review는 PR·코드 검토 제품이며 CLI /review는 터미널의 별도 검토 에이전트 경로다. 둘 다 사람의 병합·출시 승인을 대체하지 않는다. Subagents는 작업을 분리하고 CLI /fleet은 독립 부분을 병렬로 맡기는 기능이다. 네 기능을 모두 이번 영상에서 실행한 것은 아니며 기존 영상은 CLI 계획·구현·로컬 테스트·리뷰·실행 승인을 보여 준다. Cloud agent·PR 리뷰·/fleet은 제품 소개 범위다. 2026-09-26 확인. 출처: ${ideDocs}; ${cloudDocs}; https://docs.github.com/en/copilot/concepts/agents/code-review; ${reviewDocs}; ${fleetDocs}.`,
    },
    {
      id: "copilot-agent-customization", title: "팀의 기준과 도구로 에이전트를 확장합니다",
      elements: [
        ...heading("팀의 기준과 도구로 에이전트를 확장합니다", "개인의 작업을 조직에서 재사용할 수 있는 방식으로 만듭니다"),
        { kind: "table", x: 78, y: 216, w: 1124, h: 396, widths: [292, 422, 410], rows: [
          ["확장 기능", "무엇을 정의하나", "활용 예"],
          ["Custom instructions", "항상 참고할 팀의 기준", "코딩 규칙·검증 명령"],
          ["Custom agents", "역할별 지침과 허용 도구", "리뷰·테스트 전담 에이전트"],
          ["Agent skills", "필요할 때 불러올 수행 절차", "테스트·문서화 방법 재사용"],
          ["MCP", "외부 데이터·도구 연결", "이슈·업무 시스템 조회·실행"],
          ["Agentic Workflows*", "이벤트·일정 기반 Actions 실행", "이슈 분류·CI 조사·보고"],
        ] },
        text("* GitHub Agentic Workflows: Public preview · 기능·플랜·조직 정책별 지원 범위 확인", 84, 630, 1113, 32, 20, C.muted),
        text("이제 실제 CLI 데모에서 계획·승인·구현·검증·리뷰를 확인합니다", 84, 665, 1113, 27, 21, C.accent, true),
      ],
      notes: `소개 5/5. Custom instructions는 팀의 기준, Custom agents는 역할·지침·도구를 묶은 프로필, Agent skills는 작업에 맞춰 불러오는 지침·스크립트·리소스, MCP는 데이터와 도구 연결 규약이다. GitHub Agentic Workflows는 자연어로 정의한 저장소 자동화를 GitHub Actions에서 실행하는 별도 기능으로 2026-09-26 기준 Public preview다. Copilot을 실행 엔진으로 사용할 수 있으며 일정·이벤트, 권한, 허용 출력은 사람이 정의한다. 확장 기능을 설치만 하면 보안 통제가 보장된다고 설명하지 않는다. 이번 데모는 저장소 지침과 기본 CLI 도구를 사용하며 MCP·Skills·Agentic Workflows 연동을 실행한 데모가 아니다. 출처: ${instructions}; ${customAgentDocs}; ${skillsDocs}; ${mcpDocs}; ${automationDocs}.`,
    },
    {
      videoSource: "slide-value",
      title: "개발 생산성은 코드 작성 다음 단계까지",
      elements: [...heading("개발 생산성은 코드 작성 다음 단계까지", "GitHub Copilot은 계획·실행·검증을 하나의 작업 흐름으로 연결합니다"), text("실행 속도", 83, 234, 332, 58, 39, C.accent, true), text("품질 확인", 479, 234, 332, 58, 39, C.accent, true), text("조직 통제", 873, 234, 332, 58, 39, C.accent, true), text("요청을 이해하고\n여러 파일을 함께 수정", 85, 331, 332, 119, 29), text("테스트 실행과 리뷰로\n변경의 근거를 확인", 481, 331, 331, 119, 29), text("범위와 실행 권한을\n사용자가 결정", 875, 331, 329, 119, 29), line(83, 508, 1112), text("기대 효과", 84, 552, 207, 43, 27, C.muted), text("수작업 연결은 줄이고, 개발자는 판단이 필요한 일에 집중", 84, 607, 1115, 54, 30, C.ink, true)],
      notes: `세 가지 가치는 이번 데모가 보여 주는 능력에 연결한다. 실제 시간 절감률이나 ROI는 측정하지 않았으므로 수치로 주장하지 않는다. '수작업 연결 감소'는 기능에 따른 기대 효과이며 고객 파일럿에서 검증할 가설이다. 출처: ${docs}, ${reviewDocs}, ${permissions}.`,
    },
    {
      videoSource: "slide-policy",
      title: "경영진의 요청: 고액 환불에는 승인과 이력",
      elements: [...heading("경영진의 요청: 고액 환불에는 승인과 이력"), text("“100만 원 이상은 다른 담당자가 승인하고,\n소액 고객 대응은 지금처럼 유지해 주세요.”", 82, 181, 1115, 131, 38, C.accent, true), image("before-completed-row.png", 78, 355, 1125, 121), text("현재: 120만 원도 승인 없이 즉시 완료", 83, 521, 1112, 57, 32, C.orange, true), text("바꿀 것: 금액 정책 · 역할 분리 · 감사 이력 · 기존 동작 유지", 84, 610, 1113, 52, 28)],
      notes: "사업 시나리오는 합성 환불 운영 앱이다. 실제 결제나 고객 데이터가 없다. 현재 앱의 고액 처리 상태를 보여 준 뒤 정책 요청을 Copilot에 전달한다. 완성 기준과 허용 파일은 request.md 및 .github/copilot-instructions.md로 정의한다. 대기 금액을 절감액이나 예방 손실로 표현하지 않는다. 출처: demo/request.md, demo/starter.",
    },
    {
      title: "요청부터 검토까지 Copilot이 실행합니다",
      elements: [...heading("요청부터 검토까지 Copilot이 실행합니다", "사용자는 일일이 코드를 지시하는 대신 목표와 판단 기준을 제시합니다"), ...["계획", "구현", "검증", "리뷰"].flatMap((label, i) => [text(label, 88 + 291 * i, 253, 200, 54, 37, C.accent, true), ...(i < 3 ? [line(304 + 291 * i, 281, 51, C.accent, true)] : [])]), text("현재 코드 이해\n완료 기준 구체화", 88, 344, 245, 109, 28, C.muted), text("서버와 업무 화면\n테스트와 문서", 379, 344, 245, 109, 28, C.muted), text("로컬 테스트 실행\n실패 원인 보완", 670, 344, 245, 109, 28, C.muted), text("변경 내용 재검토\n남은 조건 정리", 961, 344, 244, 109, 28, C.muted), line(85, 510, 1111), text("사용자: 계획·실행 권한 승인", 88, 563, 537, 63, 29, C.green, true), text("조직: 적용·출시 여부 결정", 670, 563, 534, 63, 29, C.green, true)],
      notes: `실제 Copilot /plan, 허용 파일 수정, 명령 실행, /review로 이어진다. 전용 CLI 리뷰 에이전트는 주 작업의 변경을 다시 검사한다. 이 데모를 A2A 프로토콜이나 병렬 에이전트 전체 자동화 시연이라고 확대하지 않는다. 네이티브 승인 대화상자에 대한 시연용 입력과 실제 사람의 출시 승인을 구분한다. 출처: ${docs}, ${reviewDocs}; ${evidence}/terminal.cast.`,
    },
    {
      title: "우리 저장소의 맥락에서 시작합니다",
      elements: [...heading("우리 저장소의 맥락에서 시작합니다", "실제 Copilot CLI가 코드와 팀 지침을 읽고 계획을 제시합니다"), image("ghcp-plan.png", 78, 207, 1124, 359), text("팀 지침 + 기존 코드 + 완료 기준", 83, 601, 1110, 53, 32, C.accent, true)],
      notes: `계획 생성 전 제품 파일은 변경하지 않았다. .github/copilot-instructions.md에 수정 범위와 검증 명령을 저장해 반복 설명을 줄인다. 실제 기록 모델 설정: ${manifest.model}, ${manifest.copilot}. 제품 가치는 특정 모델 하나가 아니라 저장소·도구·권한을 연결하는 GitHub Copilot 작업 흐름이다. 출처: ${instructions}; ${evidence}/plan-ready.txt, invocation.json.`,
    },
    {
      title: "AI가 실행해도 결정권은 사용자에게",
      elements: [...heading("AI가 실행해도 결정권은 사용자에게", "Copilot이 제시한 변경과 명령을 확인하고 허용하거나 거부합니다"), image("ghcp-approval.png", 78, 207, 1124, 355), text("계획 수락과 도구 실행 승인을 구분", 83, 592, 1111, 48, 31, C.accent, true), text("실제 CLI 승인 UI · 영상의 선택 키는 시연 자동화이며 사람의 출시 승인이 아님", 84, 651, 1110, 30, 19, C.muted)],
      notes: `모든 도구를 자동 허용하는 --yolo, --allow-all, assisted approval을 사용하지 않는다. 원본 실행과 실제 승인 UI를 녹화했고 선택 키는 demo-automation으로 기록했다. 직접 발표할 때는 발표자가 동일 UI에서 명령을 읽고 일회성 Yes 또는 No를 선택한다. 도구 필터와 승인 정책을 OS 샌드박스 보장으로 표현하지 않는다. 출처: ${permissions}; ${evidence}/terminal-inputs.jsonl.`,
    },
    {
      title: "답변이 아니라 동작하는 변경을 만듭니다",
      elements: [...heading("답변이 아니라 동작하는 변경을 만듭니다", "하나의 정책 요청이 제품의 여러 부분에 함께 반영됩니다"), image("ghcp-implementation.png", 78, 218, 730, 365), text("업무 규칙", 852, 233, 345, 43, 31, C.accent, true), text("서버의 승인·차단·이력", 853, 290, 344, 48, 25), text("사용자 경험", 852, 359, 345, 43, 31, C.accent, true), text("요청·승인·반려 화면", 853, 416, 344, 48, 25), text("테스트와 문서", 852, 490, 345, 58, 31, C.accent, true), text(`${verification.changedFiles.length}개 파일의 실제 변경 · 허용 범위 밖 변경 없음`, 83, 622, 1111, 45, 27, C.muted)],
      notes: `기록된 변경 파일은 ${verification.changedFiles.join(", ")}이다. 테스트와 README를 포함한 코드가 실제 바뀌었고 snapshot과 독립 검증으로 범위를 확인했다. 원본 diff: ${evidence}/change.diff. 사진은 Copilot의 실제 출력이다. 허용 파일 이외의 인수 테스트, fixture, HTTP 서버, 패키지는 바꾸지 않는다.`,
    },
    {
      title: "업무 정책이 실제 화면에서 작동합니다",
      elements: [...heading("업무 정책이 실제 화면에서 작동합니다"), text("요청", 82, 198, 161, 47, 29, C.accent, true), image("after-pending-row.png", 255, 184, 947, 100), text("차단", 82, 335, 161, 47, 29, C.orange, true), image("after-blocked-notice.png", 255, 323, 947, 81), text("승인", 82, 468, 161, 47, 29, C.green, true), image("after-approved-row.png", 255, 452, 947, 100), text("120만 원은 승인 대기 → 자기 승인 차단 → 다른 담당자 승인", 84, 603, 1111, 62, 29)],
      notes: "이번 Copilot이 만든 작업 공간을 실제 로컬 서버로 실행한 브라우저 화면이다. process 202, 자기 승인 403, 다른 승인자 200과 감사 이력을 확인했다. 소액 35,000원 처리와 1,000,000원 경계 반려도 실행한다. 시연용 역할 선택은 운영 인증이 아니다. 실제 결제와 영구 저장은 별도 작업이다.",
    },
    {
      title: "완료를 판단할 근거까지 남깁니다",
      elements: [...heading("완료를 판단할 근거까지 남깁니다", "실행한 테스트와 별도 리뷰를 바탕으로 변경을 검토합니다"), image("ghcp-tests.png", 78, 208, 548, 275), image("ghcp-review.png", 655, 208, 547, 275), text(`${product.passed}/${product.tests}`, 85, 516, 344, 78, 59, C.green, true), text(`${acceptance.passed}/${acceptance.tests}`, 482, 516, 344, 78, 59, C.green, true), text("/review", 879, 529, 318, 69, 45, C.accent, true), text("제품 회귀 테스트", 86, 618, 342, 39, 25, C.muted), text("독립 인수 테스트", 483, 618, 342, 39, 25, C.muted), text("변경 위험 재검토", 880, 618, 318, 39, 25, C.muted)],
      notes: `수치는 실제 결과에서 생성했다. 제품 ${product.passed}/${product.tests}, 독립 인수 ${acceptance.passed}/${acceptance.tests}, git diff --check exit=0. CLI와 별도로 동일 소스에 검증을 다시 실행했다. 테스트·AI 리뷰 통과가 운영 인증이나 사람의 출시 승인을 대신하지 않는다. 출처: ${evidence}/03-verification.json, 03-tests.log, review-result.txt; ${reviewDocs}.`,
    },
    {
      videoSource: "slide-scale",
      title: "이미 쓰는 GitHub를 팀의 AI 개발 기반으로",
      elements: [...heading("이미 쓰는 GitHub를 팀의 AI 개발 기반으로", "개인의 도구 사용을 넘어 팀의 기준과 개발 흐름에 연결합니다"), text("팀의 개발 기준", 84, 230, 400, 46, 32, C.accent, true), text("저장소 지침과 역할별 에이전트로\n반복되는 맥락과 작업 방식을 공유", 516, 228, 684, 100, 29), line(83, 356, 1114), text("조직의 관리 기준", 84, 389, 400, 46, 32, C.accent, true), text("허용할 기능·모델을 조직 정책으로 관리\n제품·플랜별 적용 범위 확인", 516, 385, 684, 102, 29), line(83, 514, 1114), text("기존 개발 흐름", 84, 548, 400, 46, 32, C.accent, true), text("저장소·PR·리뷰·Actions로 연결 가능\n이번 시연은 로컬 구현·검증·리뷰까지", 516, 545, 684, 106, 29)],
      notes: `이번에 실제 보여 준 것은 저장소 지침, CLI 실행 승인, 로컬 구현·검증·리뷰다. PR 생성, GitHub Actions 실행과 배포는 시연하지 않았다. 확장 가능한 GitHub 흐름으로 구분해 설명한다. 조직·엔터프라이즈 Copilot 정책은 Business/Enterprise 및 기능별 지원 범위를 확인해야 한다. CLI는 일부 MCP 정책 미지원 등 한계가 있으므로 모든 정책이 모든 표면에 동일하게 적용된다고 말하지 않는다. 출처: ${instructions}, ${docs}, ${policyDocs}.`,
    },
    {
      title: "CXO의 질문에 실행 결과로 답합니다",
      elements: [...heading("CXO의 질문에 실행 결과로 답합니다"), { kind: "table", x: 78, y: 187, w: 1124, h: 390, widths: [350, 404, 370], rows: [
        ["경영 관점", "GitHub Copilot의 역할", "이번에 확인한 근거"],
        ["변화에 대응하는 속도", "요청을 계획과 구현으로 연결", "여러 파일의 실제 변경"],
        ["변경 품질의 확인", "검증 실행과 리뷰 지원", "테스트 결과와 리뷰 기록"],
        ["실행의 통제 가능성", "도구 권한의 사용자 승인", "네이티브 승인 화면"],
        ["조직으로의 확장", "저장소 지침과 개발 흐름 활용", "재사용 가능한 실행 경로"],
      ] }, text("ROI는 가정하지 않고, 고객의 업무와 완료 기준으로 측정합니다", 83, 619, 1110, 48, 29, C.accent, true)],
      notes: "경영 효과와 기술 증거를 연결하는 정리 슬라이드다. 시연의 속도·효과는 실측 조직 성과가 아니다. 고객별 파일럿에서 동일한 품질과 완료 기준으로 비교한다. 녹화 편집 길이, 대기 금액, 통과한 테스트 수를 생산성 비율·절감액·보안 보증으로 바꾸어 표현하지 않는다.",
    },
    {
      title: "작은 파일럿으로 우리 조직의 효과를 확인",
      elements: [...heading("작은 파일럿으로 우리 조직의 효과를 확인", "제안: 되돌릴 수 있는 내부 업무 한 가지부터 시작합니다"), text("업무 선정", 83, 242, 340, 49, 35, C.accent, true), text("기준 합의", 477, 242, 340, 49, 35, C.accent, true), text("효과 측정", 871, 242, 334, 49, 35, C.accent, true), text("승인 분기·운영 화면\n회귀 테스트 보강", 85, 329, 340, 115, 29), text("수정 범위·승인 지점\n인수 테스트·복구 경로", 479, 329, 340, 115, 29), text("완료시간·재작업\n리뷰 시간·통제 준수", 873, 329, 332, 115, 29), line(83, 498, 1113), text("같은 완료 기준으로 전후 비교 → 효과가 확인된 업무부터 확대", 84, 553, 1116, 80, 32, C.ink, true)],
      notes: "파일럿 지표는 제안이며 이번 데모의 측정 결과가 아니다. 리드타임 단축만 보지 말고 재작업, 검토 부담과 통제 준수를 함께 확인한다. 실제 인증, 결제, 영구 감사 저장과 운영 출시 심사는 별도 범위다. 자동화된 시연 입력은 인간의 출시 승인으로 인정하지 않으며 데모 출시 상태는 HOLD다.",
    },
    {
      videoSource: "slide-close",
      title: "실행은 Copilot이, 기준과 결정은 조직이", background: C.dark,
      elements: [text("GitHub Copilot", 80, 90, 1105, 83, 57, C.white, true), text("실행은 Copilot이\n기준과 결정은 조직이", 80, 238, 1114, 188, 63, C.white, true), text("개발 실행력을 높이고\n검토와 승인 지점은 유지합니다", 85, 495, 1105, 119, 36, "D7C3FF")],
      notes: "고객에게 남길 결론: GitHub Copilot은 코드를 설명하는 도구에 그치지 않고 업무 요청을 실제 변경과 검토 근거로 연결한다. 사용자는 목표·권한·출시 판단을 유지한다. 보여 주지 않은 원격 PR·Actions·배포나 측정하지 않은 ROI를 약속하지 않는다. 다음 고객 대화는 파일럿 후보 업무 한 가지와 성공 기준의 선택에 집중한다.",
    },
  ];
  return slides.map((slide, index) => ({ background: C.light, ...slide, elements: [...slide.elements, text(String(index + 1), 1200, 683, 36, 22, 14, slide.background === C.dark ? "8994A9" : "8A95A8")] }));
}
