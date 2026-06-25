// 적정 금액 힌트 (계획서 §2 AC5)
// 공식(확정): "해당 사람에게서 가장 최근 RECEIVED 단일 금액".
// 내가 그 사람 경조사에 갈 때, 그 사람이 내게 마지막으로 준 금액을 기준으로 제시한다.
// 받은 기록이 없으면 null(힌트 없음).

import type { LedgerRecord, Person } from './models';
import { normalizePhone } from './phone';
import { personLedger } from './stats';

export function suggestAmount(
  records: LedgerRecord[],
  personId: string,
): number | null {
  const received = records.filter(
    (r) =>
      r.personId === personId &&
      !r.deletedAt &&
      !r.giftName && // 선물은 추천 금액 기준에서 제외(현금만)
      r.direction === 'RECEIVED' &&
      typeof r.amount === 'number',
  );
  if (received.length === 0) return null;

  // 가장 최근(date 큰) 단일 기록의 금액. 동일 date면 더 최근에 입력된 것.
  received.sort((a, b) => b.date - a.date || b.createdAt - a.createdAt);
  return received[0]!.amount as number;
}

/** 입력 중인 사람(이름/전화)에 매칭되는 기존 Person의 평생 요약 + 적정금액.
 *  전화번호(E.164) 일치 우선, 없으면 이름 정확 일치. 매칭 없거나 기록 없으면 null.
 *  → QuickEntry에서 "이름 확정하는 순간" 인라인 힌트로 사용. */
export interface EntryHint {
  personId: string;
  displayName: string;
  net: number;
  receivedSum: number;
  givenSum: number;
  /** 그 사람이 내게 마지막으로 준 현금(없으면 null). 탭하면 금액 자동 채움. */
  suggested: number | null;
}

export function entryHint(
  records: LedgerRecord[],
  persons: Person[],
  q: { name: string; phoneRaw?: string | null },
): EntryHint | null {
  const phoneE164 = normalizePhone(q.phoneRaw);
  let person = phoneE164 ? persons.find((p) => p.phoneE164 === phoneE164) : undefined;
  if (!person) {
    const n = q.name.trim();
    if (n) person = persons.find((p) => p.displayName.trim() === n);
  }
  if (!person) return null;

  const pl = personLedger(records, person.id);
  if (pl.receivedSum === 0 && pl.givenSum === 0) return null; // 현금 기록 없으면 힌트 없음

  return {
    personId: person.id,
    displayName: person.displayName,
    net: pl.net,
    receivedSum: pl.receivedSum,
    givenSum: pl.givenSum,
    suggested: suggestAmount(records, person.id),
  };
}
