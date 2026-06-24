// 사람(Person) 병합 로직 (계획서 §4, AC3 / AC3b)
//  - 전화번호(E.164)가 있으면 동일 키 → 안전 자동 병합 대상.
//  - 전화번호가 없고 이름이 같으면 → 자동 병합 금지, 사용자에게 "같은 사람인가요?" 제안.
//  - hard delete 금지: 흡수된 id는 mergedFrom 으로 추적한다.

import type { Person, LedgerRecord } from './models';

export type MergeDecision =
  | { kind: 'AUTO_MERGE'; target: Person } // 동일 전화번호 → 안전
  | { kind: 'SUGGEST'; candidates: Person[] } // 무전화 동명이인 → 사용자 확인 필요
  | { kind: 'NEW' };

function nameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * 새 입력(candidate)을 기존 Person 목록과 대조해 처리 방법을 결정한다.
 * 자동 병합은 전화번호 일치일 때만. 이름 일치는 절대 자동 병합하지 않는다.
 */
export function resolvePerson(
  existing: Person[],
  candidate: { phoneE164?: string | null; displayName: string },
): MergeDecision {
  const phone = candidate.phoneE164 ?? null;

  if (phone) {
    const target = existing.find((p) => p.phoneE164 === phone);
    if (target) return { kind: 'AUTO_MERGE', target };
    return { kind: 'NEW' };
  }

  // 전화번호 없음: 이름 기반 후보 제시(자동 병합 금지)
  const key = nameKey(candidate.displayName);
  const candidates = existing.filter((p) => nameKey(p.displayName) === key);
  if (candidates.length > 0) return { kind: 'SUGGEST', candidates };
  return { kind: 'NEW' };
}

/**
 * target 이 absorbed 를 흡수한다(soft). displayName 은 target 유지.
 * 전화번호/상태는 더 풍부한 쪽으로 보강하고, 흡수 이력을 mergedFrom 에 남긴다.
 */
export function mergePersons(target: Person, absorbed: Person, now: number): Person {
  const mergedFrom = Array.from(
    new Set<string>([...target.mergedFrom, absorbed.id, ...absorbed.mergedFrom]),
  );
  const tossLinked =
    target.status === 'TOSS_LINKED' || absorbed.status === 'TOSS_LINKED';
  return {
    ...target,
    phoneE164: target.phoneE164 ?? absorbed.phoneE164 ?? null,
    phoneRaw: target.phoneRaw ?? absorbed.phoneRaw ?? null,
    status: tossLinked ? 'TOSS_LINKED' : target.status,
    mergedFrom,
    updatedAt: now,
  };
}

/** 흡수된 Person 의 모든 기록을 target 으로 재연결한다(FK 보존). */
export function reassignRecords(
  records: LedgerRecord[],
  fromPersonId: string,
  toPersonId: string,
  now: number,
): LedgerRecord[] {
  return records.map((r) =>
    r.personId === fromPersonId
      ? { ...r, personId: toPersonId, updatedAt: now }
      : r,
  );
}
