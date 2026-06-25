import { describe, it, expect } from 'vitest';
import { suggestAmount, entryHint } from '../../src/domain/hint';
import type { LedgerRecord, Person } from '../../src/domain/models';

function person(over: Partial<Person> & { id: string; displayName: string }): Person {
  return {
    phoneE164: null,
    phoneRaw: null,
    status: 'MANUAL',
    mergedFrom: [],
    note: null,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  };
}

function rec(p: Partial<LedgerRecord> & { id: string; personId: string; direction: LedgerRecord['direction'] }): LedgerRecord {
  return {
    eventId: null,
    amount: null,
    giftName: null,
    date: 0,
    source: 'MANUAL',
    memo: null,
    deletedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...p,
  };
}

describe('suggestAmount — 적정 금액 힌트 (AC5)', () => {
  it('가장 최근 RECEIVED 단일 금액을 반환', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 50000, date: 100 }),
      rec({ id: 'r2', personId: 'p1', direction: 'RECEIVED', amount: 100000, date: 300 }), // 가장 최근
      rec({ id: 'r3', personId: 'p1', direction: 'RECEIVED', amount: 70000, date: 200 }),
    ];
    expect(suggestAmount(records, 'p1')).toBe(100000);
  });

  it('GIVEN만 있으면(받은 적 없음) → null', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'GIVEN', amount: 50000, date: 100 }),
    ];
    expect(suggestAmount(records, 'p1')).toBeNull();
  });

  it('해당 사람 기록 없음 → null', () => {
    expect(suggestAmount([], 'p1')).toBeNull();
  });

  it('삭제된 최근 기록은 무시하고 그 다음 최근을 사용', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 50000, date: 100 }),
      rec({ id: 'r2', personId: 'p1', direction: 'RECEIVED', amount: 999999, date: 400, deletedAt: 5 }),
    ];
    expect(suggestAmount(records, 'p1')).toBe(50000);
  });

  it('동일 date면 더 늦게 입력된(createdAt 큰) 기록 우선', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 50000, date: 100, createdAt: 1 }),
      rec({ id: 'r2', personId: 'p1', direction: 'RECEIVED', amount: 80000, date: 100, createdAt: 2 }),
    ];
    expect(suggestAmount(records, 'p1')).toBe(80000);
  });
});

describe('entryHint — 입력 순간 인라인 힌트', () => {
  const persons: Person[] = [
    person({ id: 'p1', displayName: '김철수', phoneE164: '+821012345678' }),
    person({ id: 'p2', displayName: '이영희' }),
  ];
  const records: LedgerRecord[] = [
    rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 100000, date: 200 }),
    rec({ id: 'r2', personId: 'p1', direction: 'GIVEN', amount: 30000, date: 100 }),
  ];

  it('전화번호(E.164) 일치 우선 매칭 + net·적정금액 반환', () => {
    const h = entryHint(records, persons, { name: '아무이름', phoneRaw: '010-1234-5678' });
    expect(h).not.toBeNull();
    expect(h!.personId).toBe('p1');
    expect(h!.net).toBe(70000); // 받은 10만 - 보낸 3만
    expect(h!.receivedSum).toBe(100000);
    expect(h!.givenSum).toBe(30000);
    expect(h!.suggested).toBe(100000);
  });

  it('전화 없으면 이름 정확 일치로 매칭', () => {
    const h = entryHint(records, persons, { name: '김철수' });
    expect(h?.personId).toBe('p1');
  });

  it('매칭은 됐지만 현금 기록이 없으면 null', () => {
    const h = entryHint([], persons, { name: '김철수' });
    expect(h).toBeNull();
  });

  it('이름·전화 모두 매칭 실패 → null', () => {
    const h = entryHint(records, persons, { name: '박민수', phoneRaw: '010-0000-1111' });
    expect(h).toBeNull();
  });

  it('받은 적 없으면(GIVEN만) suggested는 null이지만 힌트는 표시', () => {
    const recs: LedgerRecord[] = [rec({ id: 'g', personId: 'p2', direction: 'GIVEN', amount: 50000, date: 1 })];
    const h = entryHint(recs, persons, { name: '이영희' });
    expect(h).not.toBeNull();
    expect(h!.suggested).toBeNull();
    expect(h!.net).toBe(-50000);
  });
});
