// 표시 포맷 유틸. 카피 가드(AC12): "정산/송금" 대신 "내역/장부" 사용.

export function formatKRW(n: number | null | undefined): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR') + '원';
}

/** 만원 단위 간결 표기(2,000,000 → "200만") — 칩/요약용 */
export function formatMan(n: number): string {
  if (n === 0) return '0';
  if (n % 10000 === 0) return `${(n / 10000).toLocaleString('ko-KR')}만`;
  return n.toLocaleString('ko-KR');
}

/** 기록 1건의 표시값: 선물명 우선(추정 금액 있으면 괄호), 없으면 금액. */
export function formatValue(amount: number | null | undefined, giftName: string | null | undefined): string {
  if (giftName) return amount != null ? `${giftName} (${formatKRW(amount)})` : giftName;
  return formatKRW(amount);
}

export function formatDate(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const EVENT_LABEL: Record<string, string> = {
  WEDDING: '결혼',
  FUNERAL: '장례',
  DOL: '돌',
  HOUSEWARMING: '집들이',
  BIRTHDAY: '생일',
  OTHER: '기타',
};
