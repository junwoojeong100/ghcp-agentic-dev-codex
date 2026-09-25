# Refund Control Desk

가상 기업의 환불 운영 앱이다. 120만 원 환불을 승인 없이 처리할 수 있는 현재 상태에서 시작한다.
실제 고객 정보, 결제 서비스, 계좌, 인증 공급자에 연결하지 않는다. 모든 처리는 메모리 안에서만 실행한다.

## 실행

Node.js 22 이상이 필요하다. 외부 패키지를 설치하지 않는다.

```sh
npm test
npm start
```

`http://127.0.0.1:4173`에서 연다. `PORT=4174 npm start`로 포트를 바꿀 수 있다.

## 현재 동작

`GET /api/refunds`는 합성 환불 4건, 시연용 역할, 현재 처리 현황을 반환한다.
`POST /api/refunds/:id/process`에 `{ "actorId": "cs-kim" }`을 보내면 금액과 무관하게 모의 처리를 완료한다.
`POST /api/demo/reset`은 메모리 상태를 초기화한다. 중복 처리와 클라이언트의 금액 변경은 거부한다.
승인 및 반려 워크플로와 감사 이벤트는 아직 구현하지 않았다.

## 반드시 구분할 경계

역할 선택은 실제 사용자 인증이 아니다. 추가할 감사 이력도 이 데모에서는 메모리에만 저장한다.
이 앱은 Copilot 제품 UI가 아니다. 개발 역할의 검토는 GitHub Copilot code review 제품의 시연과 다르다.
GitHub PR, GitHub Actions, 병합, 배포, Copilot Studio, A2A 프로토콜 연결을 실행하지 않는다.
