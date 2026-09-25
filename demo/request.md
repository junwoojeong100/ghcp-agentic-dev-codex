# 경영진의 요청: 100만 원 이상 환불에 승인과 감사 이력을 적용

> 고객 대응은 지연시키지 않되, 100만 원 이상 환불은 요청한 사람과 다른 운영 승인자가 결정하게 해 주세요.
> 승인 전에는 완료하지 말고, 누가 요청·승인·반려했는지와 차단한 시도를 화면에서 확인할 수 있어야 합니다.

## 이번 변경의 사업 맥락

API 기능 소개가 아니라, 경영 정책을 실제 업무 통제로 바꾸는 하나의 제품 변경이다.
같은 화면에서 120만 원 환불이 바로 완료되는 변경 전과 승인 대기로 남는 변경 후를 비교한다.
소액 3만 5천 원은 기존 처리 흐름을 유지한다. 대기 금액은 데이터의 상태이며 절감액이나 예방 성과가 아니다.

## 구현 범위

수정 허용: `src/refunds.mjs`, `public/index.html`, `public/app.mjs`, `public/styles.css`, `test/refunds.test.mjs`, `README.md`.
서비스 로직, UI 스크립트, 테스트, README는 실제 변경이 있어야 한다. HTML/CSS 변경은 필요한 경우만 한다.
기존 화면의 디자인을 유지하면서 승인·반려 버튼, 역할별 안내, 대기 금액, 감사 타임라인을 연결한다.
`src/fixtures.mjs`, `src/server.mjs`, 요청서, 에이전트 설정, handoff 파일, 패키지와 외부 인수 테스트는 수정하지 않는다.
외부 패키지, 실제 결제·DB·인증 연동, 클라우드, 배포, 외부 네트워크 도구를 추가하지 않는다.

## API와 완료 기준

`createRefundService({ seed, clock })`와 `handle(method, requestUrl, body)` 계약을 유지한다.
`seed`는 격리된 테스트용 fixture이며 클라이언트가 전달한 금액을 사용하지 않는다.

| ID | 경영 요구 | 서버 및 화면에서 확인할 결과 |
| --- | --- | --- |
| AC-1 | 경계가 명확한 금액 정책 | 1,000,000원 미만은 기존대로 completed/HTTP 200, 이상은 pending_approval/HTTP 202. policy.enforced=true |
| AC-2 | 승인 전 완료 금지 | process 시 requestedBy 설정. pending 상태에서 process 재호출은 409/INVALID_STATE. 금액·요청자 불변 |
| AC-3 | 자기 승인 금지 | 동일 actor의 approve/reject는 403/SELF_APPROVAL. 다른 support는 403/APPROVER_REQUIRED. 다른 approver만 결정 가능 |
| AC-4 | 승인·반려의 종결성 | approve는 completed, reject는 rejected. 반려 이유는 공백 제외 1~200자, 잘못되면 400/INVALID_REASON. 종료 후 재승인·처리는 409 |
| AC-5 | 감사 이력 | 유효한 actor·환불에 대한 성공·차단 업무 동작을 events에 추가. 순차 id, timestamp, refundId, actorId, action, outcome, amount, reason 저장. outcome은 allowed 또는 blocked |
| AC-6 | 경영진이 이해하는 화면 | 고액은 '승인 요청', 저액은 '환불 처리'. 승인 대기 금액/건수, actor별 승인/반려, 성공·거부 안내, 이름이 보이는 타임라인. actor 선택 변경 시 갱신 |
| AC-7 | 예외를 숨기지 않음 | 금액 덮어쓰기·알 수 없는 필드 400, 미등록 actor 401, 없는 환불 404, 중복 동작 409. 기존 오류와 데이터 복사 유지 |
| AC-8 | 재현과 경계 | reset 시 fixture·events·카운터 초기화. 인스턴스 간 상태 격리. 기존 7개 테스트 유지 및 확장. 실제 인증/금전 이동/영구 감사 저장소는 구현했다고 주장하지 않음 |

`GET /api/refunds`의 `summary`는 실제 배열에서 계산한다. pendingApprovalCount, pendingApprovalAmount, completedCount, rejectedCount를 정확히 갱신한다.
성공 응답은 기존 `{ refund, message }`를 유지하고 오류는 `{ error: { code, message } }`로 명확히 반환한다.

시연을 위해 pending 건에 '자기 승인 차단 확인' 버튼을 제공한다. 실제 approve API로 요청하여 403을 보여주되,
이는 통제 검증용임을 라벨로 밝히며 요청자에게 정상 승인 권한이 있는 것처럼 보이게 하지 않는다.
반려는 reason 입력 UI를 제공한다. 모든 서버 데이터를 textContent 등 안전한 텍스트 방식으로 렌더링한다.

## 사람의 통제와 전달 자료

계획, 코드·diff, 테스트 실행 기록, 검토 의견을 파일로 다음 역할에 전달한다.
실제 발표에서는 발표자가 계획을 읽은 후 명시적으로 승인하고, 마지막에는 출시 판단을 hold로 남긴다.
자동 리허설의 승인 입력은 `simulated-rehearsal`로 구분하며 실제 사람의 승인으로 표현하지 않는다.
로컬 테스트 성공, 역할 검토, 최종 출시 승인은 서로 다른 결과다. 원격 PR 생성·병합·배포는 수행하지 않는다.
