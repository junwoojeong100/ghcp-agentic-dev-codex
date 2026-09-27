export const scenes = [
  {
    id: "01-opening", duration: 12, source: "slide-cover", chapter: "비즈니스 요청을 제품 변경으로",
    narration: "사업 정책이 바뀌면 서비스는 얼마나 빠르게 바뀔 수 있을까요? 깃허브 코파일럿이 하나의 요청을 실제 코드 변경과 검토 근거로 연결하는 과정을 보겠습니다.",
  },
  {
    id: "02-value", duration: 12, source: "slide-value", chapter: "실행력 · 품질 확인 · 조직 통제",
    narration: "핵심은 코드 자동 완성만이 아닙니다. 계획과 구현, 테스트와 리뷰를 연결하면서 사용자가 실행 권한을 결정합니다. 개발자는 판단이 필요한 일에 집중할 수 있습니다.",
  },
  {
    id: "03-before", duration: 12, source: "before-process", motion: true, chapter: "변경 전 · 120만 원이 즉시 완료",
    narration: "현재 환불 화면에서는 백이십만 원도 바로 처리됩니다. 별도 승인과 감사 이력이 없습니다. 고객과 금액은 합성 데이터이며 실제 돈은 이동하지 않습니다.",
  },
  {
    id: "04-policy", duration: 12, source: "slide-policy", chapter: "경영진의 정책 요청",
    narration: "요청은 분명합니다. 백만 원 이상은 다른 담당자가 승인하고, 소액 처리는 유지합니다. 요청과 결정, 차단 시도는 이력으로 남겨야 합니다. 이것이 완료 기준입니다.",
  },
  {
    id: "05-cli", duration: 14, source: "ghcp-ready", motion: true, terminal: true, chapter: "실제 GitHub Copilot CLI",
    narration: "지금부터는 실제 깃허브 코파일럿 씨엘아이입니다. 별도로 만든 채팅 화면이 아니라 실행 중인 프로그램을 녹화했습니다. 조직의 요청을 이 터미널에서 실제 개발 작업으로 이어갑니다.",
  },
  {
    id: "06-plan-work", duration: 18, source: "ghcp-plan-work", motion: true, terminal: true, chapter: "저장소와 팀 지침을 읽는 에이전트",
    narration: "코파일럿이 현재 코드와 테스트, 저장소의 팀 지침을 읽습니다. 수정할 파일과 제외할 연동, 완료 기준을 함께 이해합니다. 매번 모든 맥락을 다시 설명하는 대신 팀의 기준을 저장소에 남길 수 있습니다.",
  },
  {
    id: "07-plan-result", duration: 18, source: "ghcp-plan", motion: true, terminal: true, chapter: "코드를 바꾸기 전에 계획을 확인",
    narration: "계획에는 고액 승인, 자기 승인 차단, 감사 이력과 기존 동작 유지가 들어 있습니다. 사용자는 사업 의도가 맞는지 먼저 확인합니다. 잘못 이해한 요구를 구현 후가 아니라 이 지점에서 바로잡을 수 있습니다.",
  },
  {
    id: "08-plan-accept", duration: 14, source: "ghcp-plan-accept", motion: true, terminal: true, chapter: "계획 수락 후 구현으로 전환",
    narration: "범위를 수락하면 구현으로 전환합니다. 승인은 무제한 실행 허가가 아닙니다. 합의한 제품 파일만 바꾸고 외부 결제, 원격 저장소 변경과 배포는 제외합니다.",
  },
  {
    id: "09-implementation", duration: 22, source: "ghcp-implementation", motion: true, terminal: true, chapter: "여러 파일을 실제로 수정",
    narration: "코파일럿은 답변에서 멈추지 않습니다. 서버의 상태 전이와 권한 규칙, 업무 화면의 버튼과 안내를 함께 수정합니다. 회귀 테스트와 문서도 연결합니다. 사용자는 파일마다 코드를 받아 옮기는 대신 하나의 변경 내용을 검토합니다.",
  },
  {
    id: "10-tool-approval", duration: 22, source: "ghcp-approval", motion: true, terminal: true, chapter: "실제 승인 창에서 실행 권한 결정",
    narration: "권한이 필요한 지점에서는 실제 승인 창이 나타납니다. 어떤 파일을 바꾸거나 명령을 실행할지 확인하고 이번 실행만 허용하거나 거부할 수 있습니다. 영상의 선택 키는 시연용 자동 입력입니다. 실제 사람의 출시 승인으로 취급하지 않습니다.",
  },
  {
    id: "11-tests", duration: 24, source: "ghcp-tests", motion: true, terminal: true, chapter: "예측이 아니라 실제 테스트 실행",
    narration: "이제 코파일럿이 테스트 명령을 실제 실행합니다. 고액과 소액의 경계, 역할 분리, 중복 처리와 감사 이력을 확인합니다. 실행 결과를 보고 필요한 수정을 이어갈 수 있습니다. 완성된 코드는 별도의 인수 테스트로 다시 확인하고 원본 기록을 보존합니다.",
  },
  {
    id: "12-review", duration: 24, source: "ghcp-review", motion: true, terminal: true, chapter: "별도 리뷰로 변경 위험 재확인",
    narration: "리뷰 명령은 별도의 검토 에이전트가 변경 내용을 다시 살펴보게 합니다. 구현 보고만 믿는 것이 아니라 코드와 테스트를 바탕으로 남은 위험을 확인합니다. 개발 팀에는 변경 내역과 실행 기록, 리뷰 의견이 함께 남습니다. 적용과 출시 판단은 조직이 유지합니다.",
  },
  {
    id: "13-request", duration: 18, source: "after-request", motion: true, chapter: "변경 후 · 120만 원은 승인 대기",
    narration: "방금 코파일럿이 수정한 앱을 실행합니다. 같은 백이십만 원 요청이 이제 바로 완료되지 않고 승인 대기로 남습니다. 화면의 문구만 바뀐 것이 아니라 서버의 업무 규칙이 실제로 바뀌었습니다.",
  },
  {
    id: "14-block", duration: 18, source: "after-block", motion: true, chapter: "요청자의 자기 승인은 서버에서 차단",
    narration: "요청자가 자신의 환불을 승인하려 하면 서버가 거부합니다. 승인 대기 상태는 그대로 유지되고 차단 시도도 기록됩니다. 원하는 통제가 실제 응답으로 확인되는 장면입니다.",
  },
  {
    id: "15-approve", duration: 16, source: "after-approve", motion: true, chapter: "다른 담당자 승인 후 처리 완료",
    narration: "다른 운영 승인자 역할로 바꾸면 승인할 수 있습니다. 이때 비로소 처리 완료가 되고 요청자와 승인자의 이력이 남습니다. 실제 운영 인증과 결제 연동은 별도 설계 대상입니다.",
  },
  {
    id: "16-small-audit", duration: 18, source: "after-small", motion: true, chapter: "소액 대응은 유지 · 감사 이력 연결",
    narration: "삼만 오천 원은 기존처럼 즉시 처리됩니다. 모든 업무에 승인 단계를 늘리지 않고 정한 정책에 맞춰 변경한 것입니다. 감사 화면에서는 누가 요청하고 차단되었으며 승인했는지 확인할 수 있습니다.",
  },
  {
    id: "17-scale", duration: 12, source: "slide-scale", chapter: "개인의 사용을 팀의 개발 방식으로",
    narration: "깃허브 코파일럿은 저장소 지침과 기존 개발 흐름에 연결됩니다. 팀의 기준을 공유하고 조직에 허용된 기능과 모델을 사용하면서 효과가 확인된 업무부터 확대할 수 있습니다.",
  },
  {
    id: "18-close", duration: 14, source: "slide-close", chapter: "실행은 Copilot이 · 결정은 조직이",
    narration: "실행은 코파일럿이, 기준과 결정은 조직이 담당합니다. 작은 내부 업무부터 완료 시간과 재작업, 검토 부담을 함께 측정해 보세요. 오늘의 오 분은 편집된 영상 길이이며 개발 시간이나 성과 수치는 아닙니다.",
  },
];

if (scenes.reduce((sum, scene) => sum + scene.duration, 0) !== 300) throw new Error("The edited video timeline must be exactly five minutes.");
