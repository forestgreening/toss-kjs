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

/** 이름 부분 일치로 기존 사람을 찾아 자동완성 후보를 돌려준다(이름 입력 드롭다운용).
 *  정렬: 정확일치 > 시작일치 > 부분일치, 동점은 가나다순. 빈 질의면 빈 배열. */
export function matchPersonsByName(
  persons: Person[],
  query: string,
  limit = 6,
): Person[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return persons
    .map((p) => {
      const n = p.displayName.trim().toLowerCase();
      const score = n === q ? 3 : n.startsWith(q) ? 2 : n.includes(q) ? 1 : 0;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.displayName.localeCompare(b.p.displayName, 'ko'))
    .slice(0, limit)
    .map((x) => x.p);
}

export function entryHint(
  records: LedgerRecord[],
  persons: Person[],
  q: { name: string; phoneRaw?: string | null },
): EntryHint | null {
  // 입력 상태와 동기화: 전화번호가 입력돼 있으면 "그 번호의 사람"만 매칭한다.
  //  - 다른 번호(동명이인)나 아직 미완성 번호면 이름으로 폴백하지 않고 숨김 → 잘못된 힌트 방지.
  //  - 전화번호가 비어 있을 때만 이름 정확 일치로 매칭.
  const phoneRaw = q.phoneRaw?.trim() ?? '';
  let person: Person | undefined;
  if (phoneRaw !== '') {
    const phoneE164 = normalizePhone(phoneRaw);
    if (!phoneE164) return null; // 미완성/유효하지 않은 번호 입력 중 → 표시 안 함
    person = persons.find((p) => p.phoneE164 === phoneE164);
    if (!person) return null; // 일치하는 사람 없음(다른 사람) → 표시 안 함
  } else {
    const n = q.name.trim();
    if (!n) return null;
    person = persons.find((p) => p.displayName.trim() === n);
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
