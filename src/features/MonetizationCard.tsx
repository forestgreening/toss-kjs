// 수익화 placeholder (답례품/화환). 부고에는 절대 노출하지 않는다(AC8 — 호출 측에서 가드).
// 실제 커머스는 토스페이 간편결제로 추후 연동(현재는 "준비 중" 안내만).

export function MonetizationCard() {
  return (
    <div className="card" style={{ background: '#fffaf0', border: '1px solid #ffe1b3' }}>
      <b>답례품 보내기</b>
      <p className="muted" style={{ margin: '6px 0 10px' }}>
        받은 분께 답례품·화환·상품권을 바로 보낼 수 있어요. (준비 중)
      </p>
      <button className="ghost" onClick={() => alert('답례품 기능은 준비 중이에요.')}>
        둘러보기
      </button>
    </div>
  );
}
