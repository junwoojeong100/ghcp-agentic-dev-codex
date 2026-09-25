export const threshold = 1_000_000;

export const actors = [
  { id: "cs-kim", name: "김지원", role: "support", label: "김지원 · CS 담당자" },
  { id: "cs-lee", name: "이다은", role: "support", label: "이다은 · CS 담당자" },
  { id: "ops-park", name: "박민서", role: "approver", label: "박민서 · 운영 승인자" },
];

export const initialRefunds = [
  { id: "RF-2401", customer: "오로라 리테일", order: "ORD-8021", amount: 1_200_000, reason: "대량 주문 취소", status: "requested", requestedBy: null, decidedBy: null },
  { id: "RF-2402", customer: "블루버드 스토어", order: "ORD-8022", amount: 35_000, reason: "배송비 중복 청구", status: "requested", requestedBy: null, decidedBy: null },
  { id: "RF-2403", customer: "메이플 컴퍼니", order: "ORD-8023", amount: 1_000_000, reason: "계약 옵션 변경", status: "requested", requestedBy: null, decidedBy: null },
  { id: "RF-2404", customer: "스튜디오 루프", order: "ORD-8024", amount: 240_000, reason: "일부 상품 반품", status: "requested", requestedBy: null, decidedBy: null },
];
