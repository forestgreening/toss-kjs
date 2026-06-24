// 답례 안내 (정보성). 부고에는 노출하지 않는다(AC8 — 호출 측 가드).
// 실제 커머스(토스페이 답례품/상품권)는 추후 연동 — 미완성 버튼/alert 없이 안내만.

export function MonetizationCard() {
  return (
    <div className="card" style={{ background: '#fffaf0', border: '1px solid #ffe1b3' }}>
      <b>답례, 곧 더 쉬워져요</b>
      <p className="muted" style={{ margin: '6px 0 0' }}>
        받은 분께 답례품·화환·상품권을 바로 보내는 기능을 준비하고 있어요.
      </p>
    </div>
  );
}
