# GitHub Copilot: CXO 고객용 에이전트 워크플로 데모

CXO 고객에게 GitHub Copilot의 **개발 실행력, 검토 근거, 조직의 통제권**을 보여 주는 고액 환불 승인·감사 데모다.
120만 원을 즉시 처리하던 업무를 승인 대기, 자기 승인 차단, 다른 운영 승인자의 결정과 감사 이력으로 바꾼다.
실제 Copilot CLI의 저장소 탐색, 계획 수락, 파일·명령 승인, 구현, 테스트와 `/review`를 녹화하고 그 코드로 동작하는 앱을 연결한다.

## 발표 자료

- [한국어 5분 영상](delivery/github-copilot-cxo-demo-ko-v2.mp4): 1080p MP4, 실제 CLI 화면 156초, 합성 내레이션·자막·챕터
- [CXO PowerPoint](delivery/github-copilot-cxo-agent-workflow%20%20-%20%20Repaired.pptx): 18장 · Copilot 개념·서피스·모드·에이전트 기능 → 경영 가치 → 실제 시연 → 조직 적용
- [브라우저 슬라이드](delivery/slides.html): 오프라인 열기, 방향키로 이동
- [발표·실행 가이드](delivery/copilot-cxo-demo-guide.md)
- [한국어 자막](delivery/github-copilot-cxo-demo-ko-v2.srt), [영상 대본](delivery/video-script.md)
- [원본 터미널 스트림](demo/copilot-evidence/terminal.cast), [실행 근거](demo/copilot-evidence/manifest.json)

PPT 표지 다음의 2–6장은 제품 소개다. IDE·GitHub.com·CLI·데스크톱 앱·모바일, 서피스별 모드, 클라우드 위임·리뷰·병렬 작업, 팀 지침·Custom agents·Skills·MCP·Agentic Workflows를 구분한다. 지원 범위와 Preview 표시는 2026-09-26 공식 문서 기준이며, 소개한 모든 기능을 데모에서 실행한 것은 아니다.
기존 5분 영상과 시연 코드는 유지했다. PPT에 추가한 소개 5장은 영상에 포함되지 않는다.

영상은 실제 로컬 실행을 편집한 사전 녹화물이다. **5분은 영상 길이이며 개발 소요 시간이 아니다.**
금액과 고객은 합성 데이터이고 실제 결제는 없다. 터미널 본문은 실행 중인 `copilot`의 PTY 출력을 그대로 표시한 것으로, 만들어 넣은 대화나 CLI 모형이 아니다.
네이티브 승인 창의 선택 키는 `demo-automation`으로 기록했다. **실제 사용자 승인 UI의 시연**이며 인증된 사람의 출시 승인이라고 주장하지 않는다.

## 클릭해서 보여주는 데모

Node.js 22 이상과 Git이 필요하다. 패키지 설치나 클라우드 계정 없이 사전 준비 결과를 재생할 수 있다.
두 터미널에서 각각 실행한다.

```sh
npm run demo:before
npm run demo:after
```

변경 전: `http://127.0.0.1:4173`. 변경 후: `http://127.0.0.1:4174`.
`demo:after`는 `demo/copilot-evidence`의 해시를 확인하고 이번 녹화의 patch를 새 작업 공간에 적용한 뒤 제품·독립 인수 테스트를 실행한다. 모델을 호출하거나 과거 승인을 재사용하지 않는다.
발표 순서는 김지원의 고액 승인 요청, 자기 승인 차단 확인, 박민서의 승인, 감사 이력, 소액 처리, 반려다.
CS만 요청을 시작하고 운영 승인자는 다른 담당자의 요청을 결정한다. ‘데모 초기화’로 합성 데이터를 복구할 수 있다.

## Copilot을 실제로 호출하는 경로

```sh
npm run demo:copilot -- prepare live-01
npm run demo:copilot -- launch live-01
```

`/plan`으로 시작해 계획을 검토하고 일반 모드에서 구현을 요청한다. 변경·명령 승인 창에서는 내용을 읽고 이번 실행만 허용하거나 거부한다.
Copilot 계정과 조직 정책의 사용 허용, 네트워크가 필요하며 모델 사용량이 발생한다. 모델 기본값은 계정에 허용된 `auto`이고 전역 설정은 변경하지 않는다.
실행마다 전용 `COPILOT_HOME`을 사용하므로 기존의 무제한 승인·사용자 플러그인 설정을 상속하지 않는다. 이것을 OS 샌드박스로 주장하지 않는다.

새 실행을 브라우저 터미널에서 녹화하려면 `npm ci` 후 다음 명령을 사용한다. 녹화에는 Python 3와 Google Chrome도 필요하다.

```sh
npm run demo:copilot -- prepare recording-01
npm run demo:record -- recording-01
```

녹화는 Playwright Chromium **headless** 방식으로 진행하므로 사용자 화면이나 포커스를 점유하지 않는다. 필요할 때 출력된 loopback URL을 열면 실제 CLI에 직접 입력할 수 있다. 프로그램 방식의 키 입력·마커·검증 명령은 [가이드](delivery/copilot-cxo-demo-guide.md)에 있다.

## 안전 경계와 증거

최종 출시 상태는 **HOLD**다. CLI 실행 승인, 앱 속 환불 승인, 조직의 출시 판단은 서로 다른 결정이다.
앱의 역할 선택은 실제 인증이 아니고 감사 이력은 메모리 안에만 존재한다. 운영 결제·인증·영구 저장소를 구현했다고 주장하지 않는다.
GitHub PR·Actions·병합·배포, Copilot Studio, A2A 통신 프로토콜은 시연하지 않는다.
영상의 리뷰는 CLI의 `/review` 검토 에이전트다. GitHub PR에 대한 리뷰 승인이나 병합 실행이 아니다.

`demo/copilot-evidence`에는 원본 터미널 스트림, 입력 출처, 승인 화면, 소스와 연결된 리뷰 마커, patch와 검증 결과가 있다.
원본에는 계획 모드의 변경 차단과 사용자의 삭제 요청 거부·방향 수정도 보존한다. 해시는 변조 감지를 위한 연결 근거이지 인증된 결재나 불변 감사 저장소가 아니다.
시간 절감률·ROI·예방 손실을 측정한 데모가 아니다. 고객 파일럿에서 같은 완료 기준으로 효과를 측정하도록 제안한다.

```sh
npm test
npm run demo:copilot -- replay check-01
```

기본 테스트는 시연 실행기와 시작 상태의 회귀 검증이다. `replay`는 완성한 제품과 독립 인수 테스트를 함께 재실행한다.
슬라이드의 텍스트와 도식은 편집 가능하다. Nanum Gothic 글꼴이 없는 환경에서는 글꼴 대체로 줄바꿈이 달라질 수 있으므로 영상이나 브라우저 슬라이드를 대체 자료로 사용한다.

이전 버전 발표 자료와 사용하지 않는 생성 스크립트는 정리했다. `demo/workflow.mjs`의 공통 준비 로직과 파일 전달형 데모의 재현 자료(`demo/agents`, `demo/fallback`)는 유지한다. 고객 발표에는 위 링크의 최신 영상과 복구된 PPT를 사용한다.
