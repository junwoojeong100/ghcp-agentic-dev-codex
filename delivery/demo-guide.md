# CXO 데모 가이드: 고액 환불의 승인과 감사

## 전달할 메시지

**GitHub Copilot은 경영진의 정책 요청을 계획, 실제 UI·서버 변경, 테스트, 검토 자료로 연결한다. 범위와 출시 결정은 사람이 맡는다.**

청중에게 코드 문법이나 에이전트 수를 기억시키지 않는다. “120만 원 환불이 바로 완료되던 화면이 승인 대기로 바뀌고, 자기 승인은 차단된다”는 장면을 남긴다.
업무 앱 속 환불 승인과 개발 변경에 대한 사람의 출시는 서로 다른 두 통제 지점이다.
시연 정책은 CS 담당자만 환불 요청을 시작하고 운영 승인자는 그 요청을 결정하는 방식이다. 검토에서 발견한 UI/API 역할 불일치도 서버와 테스트에 반영한다.

## 가장 쉬운 발표 방법

`github-copilot-cxo-demo-ko.mp4`를 전체 화면으로 재생한다. 약 5분 분량이며 한국어 내레이션과 자막을 포함한다.
영상은 실제 로컬 실행을 편집한 사전 녹화물이다. 5분은 편집된 영상 길이이며 구현 소요 시간이나 생산성 수치가 아니다.
가상 고객, 모의 금액과 역할을 사용하며 실제 결제를 실행하지 않는다. 자동 리허설의 승인 입력은 실제 사람의 승인이 아니다.

화면을 직접 조작하려면 프로젝트 루트에서 각각 별도 터미널로 실행한다. Node.js 22 이상이 필요하며 패키지 설치는 필요 없다.

```sh
npm run demo:before
npm run demo:after
```

변경 전은 `http://127.0.0.1:4173`, 사전 준비한 변경 후는 `http://127.0.0.1:4174`다.
`demo:after`는 저장한 Copilot 변경 patch를 새 작업 공간에 적용하고 현재 로컬 테스트를 다시 실행한다. Copilot을 새로 호출하지 않는다.
포트 충돌 시 `node demo/serve.mjs before 4273`처럼 지정한다. 다른 프로세스를 종료하지 않는다.

## 화면별 진행과 핵심 문장

| 장면 | 보여줄 결과 | 발표자의 문장 | 대체 자료 |
| --- | --- | --- | --- |
| 변경 전 | 김지원 역할에서 RF-2401의 120만 원을 처리하면 즉시 완료, 감사 이벤트 0건 | “고객 대응은 빠르지만, 금액에 맞는 승인 통제가 없습니다.” | 영상의 변경 전 장면 |
| 경영진 요청 | 100만 원 이상 별도 승인, 소액 흐름 유지, 결정과 차단 시도 기록 | “요청은 API 옵션이 아니라 업무 정책입니다.” | `demo/request.md` |
| 계획과 범위 | UI·서버·테스트·문서의 변경 범위, 제외 파일, 완료 기준 | “Copilot이 제안한 범위를 사람이 먼저 검토합니다.” | `demo/fallback/01-plan.md` |
| 구현 결과 | 실제 변경 diff와 실행 기록 | “정책을 화면, 서버의 통제 규칙, 회귀 테스트에 함께 반영합니다.” | `demo/fallback/change.diff`, `02-implementation.md` |
| 고액 요청 | 변경 후 RF-2401의 승인 요청을 누르면 202, 승인 대기 120만 원, 완료 0건 | “버튼 이름만 바뀐 것이 아닙니다. 서버가 완료를 보류합니다.” | 준비 결과 앱 또는 영상 |
| 자기 승인 | 김지원의 ‘자기 승인 차단 확인’으로 403/SELF_APPROVAL | “요청한 사람이 스스로 승인할 수 없습니다. 이 버튼은 차단 확인용입니다.” | 영상의 차단 장면 |
| 다른 승인자 | 박민서 역할로 바꿔 승인하면 완료, 대기 금액 감소 | “승인 권한을 가진 다른 담당자가 결정해야 상태가 바뀝니다.” | 준비 결과 앱 |
| 감사 | 요청, 차단, 승인에 actor·금액·시각·결과 표시 | “결과뿐 아니라 누가 어떤 시도를 했는지 확인합니다.” | 영상의 타임라인 |
| 기존 흐름 | 김지원의 RF-2402 35,000원은 즉시 완료 | “통제를 강화하면서 소액 고객 대응은 기존대로 유지합니다.” | 준비 결과 앱 |
| 반려 | 김지원으로 RF-2403 요청, 박민서로 이유를 입력해 반려 | “정상 승인뿐 아니라 예외 흐름까지 제품에 반영합니다.” | 준비 결과 앱 |
| 검증과 검토 | 로컬 테스트 기록, 독립 인수 테스트, 읽기 전용 검토 의견 | “테스트 통과와 출시 승인은 다릅니다. 남은 위험을 보고 결정합니다.” | `03-verification.json`, `03-tests.log`, `04-review.md` |
| 마무리 | 출시 상태 hold, 실제 인증·결제·영구 저장 미연동 | “Copilot은 검토 가능한 변경을 만들고, 우리는 책임 있게 적용 범위를 결정합니다.” | 마지막 슬라이드 |

## 실제 Copilot 역할 실행을 보여주는 경우

사전 녹화와 달리 아래 경로는 Copilot CLI를 실제 호출한다. 계정과 조직 정책에서 사용을 허용해야 하고 모델 사용량이 발생할 수 있다.
GitHub CLI 로그인 상태만으로 Copilot 사용 권한을 단정하지 않는다. 발표 전에 같은 CLI 버전과 계정으로 새 실행 이름을 사용해 리허설한다.

```sh
copilot --version
node demo/workflow.mjs prepare stage-01
node demo/workflow.mjs plan stage-01
```

여기서 멈추고 `.demo-runs/stage-01/evidence/01-plan.md`를 읽는다. 발표자가 범위에 동의한 뒤에만 다음 명령을 직접 실행한다.

```sh
node demo/workflow.mjs approve-plan stage-01 --by presenter
node demo/workflow.mjs implement stage-01
node demo/workflow.mjs verify stage-01
node demo/workflow.mjs review stage-01
```

검토 의견과 실제 diff를 읽은 뒤 최종 판단을 기록한다. 이 예시는 출시 보류로 종료하며 원격 작업을 하지 않는다.

```sh
node demo/workflow.mjs decision stage-01 --by presenter --decision hold --reason "운영 인증과 영구 감사 저장소 검토 전 출시 보류"
```

`--by`는 발표자가 입력한 라벨이지 인증된 결재 시스템이 아니다. 계획·소스의 해시 확인도 독립 보안 경계나 변경 불가능한 감사 로그를 뜻하지 않는다.
계획과 검토 역할은 읽기·검색만 사용한다. 구현 역할에는 허용한 파일의 편집만 열어 둔다. 모델에 셸, 웹, 원격 GitHub 도구, 하위 에이전트 실행을 제공하지 않는다.
테스트와 git diff 실행은 모델이 아니라 이 로컬 스크립트가 담당한다. 인계는 파일을 통한 명시적 순차 실행이며 자율 에이전트 네트워크가 아니다.

## 실패 시 전환

| 상황 | 대응 |
| --- | --- |
| 인증, 조직 정책, 네트워크 문제 또는 CLI 지연 | “이후는 사전 리허설 결과입니다”라고 말하고 영상이나 `npm run demo:after`로 전환한다. 로그인 정보나 토큰을 화면에 노출하지 않는다. |
| 구현 실패 또는 테스트 실패 | 성공으로 넘기지 않는다. evidence 로그를 보여 주고 hold로 멈춘다. 준비 결과는 별도 화면임을 밝힌다. |
| 역할 호출에 필요한 도구 없음 | CLI 버전·tool availability를 확인한다. 무제한 도구 권한을 켜서 우회하지 않는다. |
| 작업 공간이 이미 존재 | 새 이름으로 prepare한다. reset/clean으로 기존 변경을 지우지 않는다. |
| 실행 중 코드 또는 증거 변경 | verify부터 다시 수행하고 새로운 검토를 받는다. 이전 승인 기록을 새 변경에 재사용하지 않는다. |
| 영상 재생 또는 음성 문제 | MP4를 로컬로 복사해 재생한다. 별도 한국어 SRT와 PPT를 대체 자료로 사용한다. |

## 발표 전 점검과 주장 범위

실제 재현 확인은 `demo/fallback/manifest.json`과 검증 기록으로 추적한다. 앱의 역할별 UI는 별도로 브라우저에서 확인한다.
PPTX는 편집 가능한 PresentationML로 생성하고 LibreOffice로 전체 슬라이드를 렌더링했다. 파일 구조, 글꼴 선언, 텍스트 누락·영역, 브라우저 레이아웃을 검사했다. PowerPoint 앱에서의 직접 확인과 이미지의 육안 검토는 이 제작 환경에서 수행하지 못했다.
CLI custom agents, 허용 파일 편집, 로컬 테스트, 변경 diff, 파일 인계만 본 데모의 확인 대상으로 삼는다.
GitHub Copilot cloud agent, GitHub Copilot code review 제품, 원격 PR, GitHub Actions, Copilot Studio 워크플로와 A2A 프로토콜 연결은 본 데모에서 시연하지 않는다.
Agent-to-Agent는 역할별 결과물 전달 설계라는 뜻으로만 사용한다.
120만 원/220만 원은 합성 요청 또는 대기 잔액이다. 매출 증가, 손실 방지액, 시간 절감률, 운영 안전성 성과로 말하지 않는다.

## 파일럿 선택

비운영 환경에서 완료 기준과 변경 범위가 분명하고 쉽게 되돌릴 수 있는 업무 정책 변경을 고른다.
예시는 합성 데이터의 승인 분기, 내부 운영 화면, 회귀 테스트 보강이다. 실제 결제 엔진이나 운영 인증을 첫 파일럿으로 선택하지 않는다.
리드타임, 재작업, 검토 부담을 기존 방식과 같은 완료 기준으로 측정한다. 이 데모는 그 개선 수치를 제공하지 않는다.

## 공식 참고 자료

- GitHub Copilot CLI custom agents: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
- Custom agent configuration: https://docs.github.com/en/copilot/reference/custom-agents-configuration
- CLI permissions and tool names: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference
- Copilot Studio: https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-what-is-copilot-studio
- A2A protocol: https://a2a-protocol.org/latest/specification/
