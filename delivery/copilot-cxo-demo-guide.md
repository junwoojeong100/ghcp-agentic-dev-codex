# GitHub Copilot CXO 고객 데모 가이드

## 고객에게 남길 메시지

**GitHub Copilot은 비즈니스 요청을 실제 코드 변경과 검토 근거로 연결한다. 실행은 에이전트가 수행하고, 기준·권한·출시는 조직이 결정한다.**

코드 문법이나 모델 이름보다 세 가지를 강조한다. 계획부터 구현까지 이어지는 실행력, 테스트·리뷰로 확인할 수 있는 변경 근거, 사용자가 유지하는 승인 지점이다. ROI나 속도 개선 비율은 이 데모에서 측정하지 않았으며 고객의 파일럿에서 확인할 가설이다.

## 발표 자료와 진행

- `github-copilot-cxo-agent-workflow  -  Repaired.pptx`: 현재 발표용 복구본 18장. 표지 → 제품 소개 5장 → 기존 경영 가치·정책 요청·실행·조직 적용·파일럿 순서다.
- `github-copilot-cxo-demo-ko-v2.mp4`: 한국어 5분 영상. 실제 CLI 장면 156초, 내레이션·화면 자막·선택형 자막·18개 챕터를 포함한다.
- `slides.html`: 오프라인 브라우저 발표용. 방향키로 이동한다.
- `../demo/copilot-evidence/terminal.cast`: 원본 터미널 스트림. 중간 대기·차단·재지시도 보존한다.
- `video-script.md`, `github-copilot-cxo-demo-ko-v2.srt`: 발표 대본과 자막이다.

| 영상 구간 | 보여 줄 것 | CXO에게 연결할 의미 |
| --- | --- | --- |
| 00:00–00:48 | 가치 제안과 승인 없이 완료되는 120만 원 환불 | 사업 정책을 제품 변경으로 연결하는 문제 |
| 00:48–03:24 | 실제 Copilot CLI의 탐색·계획·승인·수정·검증·리뷰 | 답변을 넘어 실행하고, 근거와 통제 지점을 남김 |
| 03:24–04:34 | 같은 코드의 업무 앱: 대기·차단·승인·소액 처리 | 원하는 정책이 실제 업무 동작으로 바뀜 |
| 04:34–05:00 | 팀 적용과 마무리 | 고객 업무 하나에서 효과를 확인한 뒤 확대 |

권장 멘트: “개발자가 파일마다 코드를 받아 옮기는 대신, Copilot이 작업을 연결하고 개발자는 의도·권한·결과를 검토합니다.”

## 발표 서두: 제품 소개 5장

표지 뒤에 개념을 먼저 소개한 뒤 7장의 경영 가치와 기존 데모로 이어 간다. 기존 5분 영상은 변경하지 않았으며 아래 소개는 PPT에만 추가했다.

| PPT | 소개 내용 | 설명할 핵심 |
| --- | --- | --- |
| 2 | GitHub Copilot은 무엇인가 | 코드 이해·작성·검토·작업 실행을 돕는 AI 개발 도우미이며 특정 모델 하나가 아님 |
| 3 | 주요 서피스 | IDE, GitHub.com, CLI, GitHub Copilot app, GitHub Mobile은 사용하는 화면·도구의 차이 |
| 4 | 모드와 자율성 | IDE의 Ask·Edit·Plan·Agent와 CLI/app의 Interactive·Plan·Autopilot을 구분 |
| 5 | 에이전트의 개발 작업 | 로컬 구현·검증, Cloud agent, 코드 리뷰, Subagents·CLI /fleet |
| 6 | 팀 맞춤 확장과 자동화 | Custom instructions, Custom agents, Agent skills, MCP, GitHub Agentic Workflows |

“서피스는 어디서 쓰는가, 모드는 어떻게 함께 일하는가, 에이전트 기능은 어떤 일을 맡기는가입니다”라고 구분하면 이해하기 쉽다. Edit를 포함한 모드 지원과 기본값은 IDE·버전에 따라 다르며, 모드를 선택했다고 실행 권한을 무제한으로 준 것은 아니다. Autopilot의 로컬 연속 실행과 Cloud agent의 원격 위임도 다른 기능이다.

GitHub Agentic Workflows는 **Public preview**인 별도 GitHub Actions 기반 자동화 기능이다. 제품 소개는 2026-09-26 공식 문서를 기준으로 작성했고 각 슬라이드의 발표자 노트에 근거를 넣었다. 플랜·조직 정책·클라이언트별 지원 범위를 확인한다. Cloud agent·PR 리뷰·/fleet·MCP·Skills·Agentic Workflows를 이번 영상에서 실행했다고 설명하지 않는다.

## 실제 CLI와 승인 장면의 의미

영상의 터미널 본문은 실행 중인 **GitHub Copilot CLI**의 PTY 출력을 xterm에 그대로 전달해 실시간 녹화한 것이다. **Playwright Chromium의 `headless: true`와 `recordVideo`**를 사용하며, 사용자 화면을 띄우거나 포커스를 바꾸지 않는다. 앱 시연과 슬라이드 캡처도 headless로 수행한다. 저장된 응답을 채팅 UI로 재구성하거나 가짜 명령·테스트 결과를 넣지 않았다. 화면 상단과 하단의 설명, 내레이션과 자막은 편집 요소다. 대기 구간은 생략했으며 5분을 구현 시간으로 제시하지 않는다.

네이티브 승인 대화상자는 실제로 실행을 멈춘다. 영상 제작 시 선택 키는 자동 입력했고 `terminal-inputs.jsonl`에 `demo-automation`으로 남겼다. **실제 승인 UI의 재현이지 인증된 사람의 출시 승인이 아니다.** 직접 발표에서는 발표자가 같은 화면에서 명령과 diff를 읽고 일회성 허용 또는 거부를 선택한다.

실행 기록에는 Plan mode에서 변경이 차단된 장면과 파일 삭제 요청을 거부한 뒤 기존 파일 안에서 수정하도록 재지시한 장면도 있다. 영상의 편집이 “첫 시도에 완벽하게 완료됐다”는 주장을 뜻하지 않는다.

## 준비한 앱을 클릭해서 보여주기

Node.js 22 이상과 Git이 필요하다. 모델 계정이나 패키지 설치 없이 기록한 결과를 로컬에서 다시 검증할 수 있다.

```sh
npm run demo:before
# 다른 터미널
npm run demo:after
```

변경 전은 `http://127.0.0.1:4173`, 변경 후는 `http://127.0.0.1:4174`다. `demo:after`는 기록의 해시와 기준 소스를 확인하고 patch를 새 작업 공간에 적용한다. 실제 제품·독립 인수 테스트를 다시 실행하지만 Copilot은 호출하지 않는다. 따라서 **사전 실행 결과 재생**으로 소개한다.

진행 순서: 김지원의 RF-2401 승인 요청 → 같은 담당자의 자기 승인 차단 확인 → 박민서 운영 승인자 선택 → 승인 → 감사 타임라인 → 김지원의 RF-2402 소액 처리 → RF-2403 요청과 반려. “데모 초기화”는 합성 상태만 초기화한다.

## Copilot을 직접 실행하는 발표

사용이 허용된 Copilot 계정·조직 정책과 네트워크가 필요하다. GitHub 로그인 자체가 특정 Copilot 기능·모델의 권한을 보증하지는 않는다. 모델 사용량이 발생하므로 같은 계정으로 미리 리허설한다.

```sh
copilot --version
npm run demo:copilot -- prepare customer-live-01
npm run demo:copilot -- launch customer-live-01
```

실행기는 실제 `copilot`을 호출한다. 전용 작업 공간과 `COPILOT_HOME`, 제한된 도구 집합을 사용한다. `--allow-all`, `--yolo`, assisted approval을 켜지 않으며 전역 모델·추론·퍼미션 설정을 바꾸지 않는다. 기본 모델은 계정에 허용된 Auto다. 개인 설정·커스텀 모델 공급자를 새 데모에 가져오지 않는다.

1. 폴더 신뢰 창에서 시연용 작업 공간 경로를 확인하고 이번 세션의 **Yes**를 선택한다.
2. `/plan request.md와 .github/copilot-instructions.md를 읽고 고액 환불 승인 정책을 계획해 주세요. 구현 전 승인을 기다려 주세요.`를 입력한다.
3. 계획과 완료 기준을 읽고 승인한다. **Plan mode에서는 파일 변경이 차단된다.** 구현 전 Shift+Tab으로 일반 모드로 바꾼다. 버전에 따라 autopilot을 거치므로 하단에 `plan`이나 `autopilot`이 없는지 확인한다.
4. “승인한 범위만 구현하고 지정된 두 테스트와 git diff --check를 실행해 주세요. 기존 파일 삭제 대신 Update File/edit로 수정하고 일회성 승인만 요청하세요.”라고 지시한다.
5. 각 승인 창에서 변경 파일 또는 명령을 확인한다. 이번 실행만 허용하며, 불필요한 삭제나 범위 밖 실행은 Esc로 거부하고 방향을 수정한다. 저장소 전체 파일 작업을 영구 허용하지 않는다.
6. `/review request.md의 계약 기준으로 현재 변경을 검토해 주세요. 파일은 수정하지 마세요.`를 실행한다.
7. 수정이 더 필요하면 구현·검증·리뷰를 반복한다. `/exit`로 종료하고 조직의 출시 판단은 별도로 남긴다.

```sh
npm run demo:copilot -- verify customer-live-01
```

새 실행 이름을 사용한다. 기존 실행을 reset/clean으로 지우거나 과거 승인 기록을 새 변경에 재사용하지 않는다.

## 새 녹화와 재빌드

녹화에는 개발 의존성, Python 3, Google Chrome이 추가로 필요하다. 음성·영상 빌드에는 macOS `say`의 Yuna 음성, FFmpeg와 Pillow가 필요하다.

```sh
npm ci
npm run demo:copilot -- prepare recording-01
npm run demo:record -- recording-01
```

출력된 loopback URL의 터미널에 직접 입력한다. 자동 입력은 다음처럼 수행하며, 출처는 `demo-automation`으로 기록한다. 마커는 실제 화면과 그 시점의 소스 해시를 저장한다. `key`는 현재 화면을 확인한 뒤 사용한다.

```sh
npm run demo:copilot -- screen recording-01
npm run demo:copilot -- prompt recording-01 plan
npm run demo:copilot -- key recording-01 enter
npm run demo:copilot -- mark recording-01 plan-ready
```

구현·리뷰가 끝나고 CLI가 정상 종료한 뒤 다음을 수행한다. `freeze`는 기존 근거 디렉터리를 덮어쓰지 않는다. 교체할 때에는 이전 버전을 보존하고 대상 경로를 명시적으로 관리한다.

```sh
node video/capture-app.mjs recording-01
npm run demo:copilot -- freeze recording-01
node video/prepare-clips.mjs recording-01
node presentation/build.mjs cxo-next
node presentation/capture-slides.mjs
node video/prepare-audio.mjs
python3 video/captions.py
node video/render.mjs
```

필요한 장면 마커와 구간 선택은 `video/prepare-clips.mjs`에 정의돼 있다. 녹화의 결과와 다른 자막·숫자를 사용하지 않는다. PPT 전체 렌더와 텍스트·영역 검사는 `presentation/check-render.py`로 수행한다. 브라우저 슬라이드 이미지 생성은 `presentation/capture-slides.mjs`를 사용한다.
빌드에는 기존 출력과 겹치지 않는 새 revision 이름을 사용한다. 영상용 슬라이드는 페이지 번호 대신 `slide-cover`, `slide-value`, `slide-policy`, `slide-scale`, `slide-close`라는 고정 이름으로 연결하므로 소개 슬라이드를 추가해도 원래 장면이 유지된다. 영상 재빌드 때에는 위 순서대로 timeline도 다시 생성한다.

## 근거와 운영 경계

`demo/copilot-evidence/manifest.json`은 실제 CLI 버전·모델 설정, 승인 입력 출처, 파일별 해시, 기준 소스와 최종 소스를 연결한다. `terminal.cast`는 원본 출력, `terminal-inputs.jsonl`은 입력 기록, `terminal-marks.json`은 화면과 코드의 연결 지점이다. 최종 patch, 제품·독립 테스트와 브라우저 검증도 함께 보존한다. 편집 전 전체 영상은 제작한 실행의 `.demo-runs/<이름>/copilot-terminal-unedited.webm`에 남기고, 배포 영상에는 원본에서 선택한 구간만 넣는다. 기록은 로컬 수정 가능 자료이며 인증된 전자결재나 불변 감사 저장소가 아니다.

앱의 역할 선택은 실제 인증이 아니고 감사 이력은 메모리에 있다. 운영 결제·영구 저장·실제 신원 검증은 별도 설계다. CLI 실행 승인, 앱의 환불 승인, 조직의 출시 승인을 혼동하지 않는다. 최종 출시 상태는 **HOLD**다.

이번에 실제 보여 준 것은 CLI와 로컬 개발 흐름이다. 원격 PR 생성, GitHub Actions 실행, 병합·배포, Copilot Studio와 A2A 프로토콜은 시연하지 않았다. 조직별 기능·모델 정책과 GitHub 개발 흐름으로의 확장은 고객 환경에서 확인할 수 있는 별도 역량으로 설명한다.

PPT의 텍스트·도식·표는 편집 가능하다. Nanum Gothic이 없는 환경에서는 줄바꿈이 달라질 수 있으므로 고객 발표 PC에서 확인한다. 제작 환경의 직접 이미지 입력이 지원되지 않아 PowerPoint 앱에서의 직접 확인과 육안 레이아웃 검토를 했다고 주장하지 않는다. LibreOffice 렌더, 네이티브 텍스트 보존·영역과 브라우저 레이아웃 검사 결과를 사용한다.

## 공식 근거

- [GitHub Copilot 개요](https://docs.github.com/en/copilot/get-started/about-github-copilot)
- [IDE 모드와 사용법](https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide)
- [GitHub Copilot app](https://docs.github.com/en/copilot/concepts/agents/github-copilot-app)
- [GitHub Mobile](https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-mobile)
- [Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-cloud-agent)
- [Copilot code review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Autopilot](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/autopilot), [Subagents와 /fleet](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/speed-up-task-completion)
- [Custom agents](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-custom-agents), [Agent skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills), [MCP](https://docs.github.com/en/copilot/concepts/context/mcp)
- [GitHub Agentic Workflows · Public preview](https://docs.github.com/en/copilot/concepts/agents/about-github-agentic-workflows)
- [Copilot CLI 개요](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-copilot-cli)
- [CLI 사용과 Plan mode](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/overview)
- [도구 사용 승인과 거부](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools)
- [저장소 지침](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [CLI 리뷰 에이전트](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/agentic-code-review)
- [조직·엔터프라이즈 정책](https://docs.github.com/en/copilot/concepts/enterprise/policies)
