// 적정 금액 힌트 (계획서 §2 AC5)
// 공식(확정): "해당 사람에게서 가장 최근 RECEIVED 단일 금액".
// 내가 그 사람 경조사에 갈 때, 그 사람이 내게 마지막으로 준 금액을 기준으로 제시한다.
// 받은 기록이 없으면 null(힌트 없음).

import type { LedgerRecord } from './models';

export function suggestAmount(
  records: LedgerRecord[],
  personId: string,
): number | null {
  const received = records.filter(
    (r) =>
      r.personId === personId &&
      !r.deletedAt &&
      r.direction === 'RECEIVED' &&
      typeof r.amount === 'number',
  );
  if (received.length === 0) return null;

  // 가장 최근(date 큰) 단일 기록의 금액. 동일 date면 더 최근에 입력된 것.
  received.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  return received[0]!.amount as number;
}
