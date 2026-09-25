# GitHub Copilot: Agentic Development in Action

CXO가 업무 결과와 통제 지점을 이해하도록 구성한 **고액 환불 승인·감사 데모**다.
120만 원을 즉시 처리하던 업무를 승인 대기, 자기 승인 차단, 다른 운영 승인자의 결정과 감사 이력으로 바꾼다.
Copilot CLI의 계획·구현·검토 실행 기록, 독립 검증, 실제 브라우저 동작을 연결한다.

## 발표 자료

- [한국어 5분 영상](delivery/github-copilot-cxo-demo-ko.mp4): 1080p MP4, 합성 내레이션, 화면 자막, 챕터
- [PowerPoint 슬라이드](delivery/github-copilot-agentic-development-cxo.pptx)
- [브라우저 슬라이드](delivery/slides.html): 오프라인 열기, 방향키로 이동
- [화면별 발표·실행 가이드](delivery/demo-guide.md)
- [한국어 자막](delivery/github-copilot-cxo-demo-ko.srt), [영상 대본](delivery/video-script.md)

영상은 실제 로컬 실행을 편집한 사전 녹화물이다. **5분은 영상 길이이며 개발 소요 시간이 아니다.**
금액과 고객은 합성 데이터이고 실제 결제는 없다. 기록 화면은 저장한 결과를 읽기 쉽게 표시한 것이며 Copilot 제품 UI가 아니다.

## 클릭해서 보여주는 데모

Node.js 22 이상과 Git이 필요하다. 패키지 설치나 클라우드 계정 없이 사전 준비 결과를 재생할 수 있다.
두 터미널에서 각각 실행한다.

```sh
npm run demo:before
npm run demo:after
```

변경 전: `http://127.0.0.1:4173`. 변경 후: `http://127.0.0.1:4174`.
`demo:after`는 보존한 patch를 새 로컬 작업 공간에 적용하고 제품·독립 인수 테스트를 다시 실행한다. 모델을 호출하지 않는다.
발표 순서는 김지원의 고액 승인 요청, 자기 승인 차단 확인, 박민서의 승인, 감사 이력, 소액 처리, 반려다.
CS만 요청을 시작하고 운영 승인자는 다른 담당자의 요청을 결정한다. ‘데모 초기화’로 합성 데이터를 복구할 수 있다.

## Copilot을 실제로 호출하는 경로

```sh
node demo/workflow.mjs prepare live-01
node demo/workflow.mjs plan live-01
```

계획을 읽고 발표자가 범위를 승인해야 구현 단계로 넘어간다. 나머지 명령과 실패 시 전환 경로는 [가이드](delivery/demo-guide.md)에 있다.
실제 역할 실행에는 사용이 허용된 GitHub Copilot 계정, 조직 정책, 네트워크가 필요하며 모델 사용량이 발생할 수 있다.
확인한 CLI 환경은 `demo/fallback/manifest.json`에 기록했다. 현재 배포판에서도 반드시 새 이름으로 사전 리허설한다.

## 안전 경계와 증거

최종 출시 상태는 **HOLD**다. `simulated-rehearsal`은 자동 리허설 입력이며 실제 사람의 승인이 아니다.
앱의 역할 선택은 실제 인증이 아니고 감사 이력은 메모리 안에만 존재한다. 운영 결제·인증·영구 저장소를 구현했다고 주장하지 않는다.
GitHub PR·Actions·병합·배포, Copilot Studio, A2A 통신 프로토콜은 시연하지 않는다.
검토 역할은 CLI custom agent이며 GitHub Copilot code review 제품과 구분한다.

`demo/fallback`에는 실제 계획, 최종 patch, 테스트 기록, 검토 의견과 실패·수정 이력이 있다.
통과하지 못한 테스트와 리뷰 지적을 숨기지 않고 보존했다. 대기 잔액을 절감액·예방한 손실·생산성 지표로 해석하지 않는다.

```sh
npm test
node demo/workflow.mjs replay check-01
```

기본 테스트는 시연 실행기와 시작 상태의 회귀 검증이다. `replay`는 완성한 제품과 독립 인수 테스트를 함께 재실행한다.
슬라이드의 텍스트와 도식은 편집 가능하다. Nanum Gothic 글꼴이 없는 환경에서는 글꼴 대체로 줄바꿈이 달라질 수 있으므로 영상이나 브라우저 슬라이드를 대체 자료로 사용한다.
