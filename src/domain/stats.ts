// 통계 계산 (계획서 §2 AC4 / AC5)
//  - 이벤트 정산: 총액 / 건수 / 평균 / 최고 기여자 TopN
//  - 사람 장부: 받은 합 / 준 합 / 순(net)
// 삭제된(deletedAt) 기록과 금액 없는(선물) 기록은 금액 집계에서 제외한다.

import type { Direction, LedgerRecord, Person } from './models';

export interface TopContributor {
  personId: string;
  name: string;
  sum: number;
}

export interface EventStats {
  total: number;
  count: number;
  average: number;
  top: TopContributor[];
}

function hasAmount(r: LedgerRecord): r is LedgerRecord & { amount: number } {
  return !r.deletedAt && typeof r.amount === 'number';
}

export function eventStats(
  records: LedgerRecord[],
  persons: Map<string, Person>,
  opts?: { direction?: Direction; topN?: number },
): EventStats {
  const direction = opts?.direction ?? 'RECEIVED';
  const topN = opts?.topN ?? 3;

  const active = records.filter(
    (r): r is LedgerRecord & { amount: number } =>
      hasAmount(r) && r.direction === direction,
  );
  const total = active.reduce((s, r) => s + r.amount, 0);
  const count = active.length;
  const average = count ? Math.round(total / count) : 0;

  const byPerson = new Map<string, number>();
  for (const r of active) {
    byPerson.set(r.personId, (byPerson.get(r.personId) ?? 0) + r.amount);
  }
  const top: TopContributor[] = [...byPerson.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([personId, sum]) => ({
      personId,
      name: persons.get(personId)?.displayName ?? '(알 수 없음)',
      sum,
    }));

  return { total, count, average, top };
}

export interface PersonLedger {
  receivedSum: number;
  givenSum: number;
  /** net = 받은 합 − 준 합. 양수면 내가 더 받음(갚을 차례). */
  net: number;
}

export function personLedger(
  records: LedgerRecord[],
  personId: string,
): PersonLedger {
  const mine = records.filter(
    (r): r is LedgerRecord & { amount: number } =>
      r.personId === personId && hasAmount(r),
  );
  const receivedSum = mine
    .filter((r) => r.direction === 'RECEIVED')
    .reduce((s, r) => s + r.amount, 0);
  const givenSum = mine
    .filter((r) => r.direction === 'GIVEN')
    .reduce((s, r) => s + r.amount, 0);
  return { receivedSum, givenSum, net: receivedSum - givenSum };
}
