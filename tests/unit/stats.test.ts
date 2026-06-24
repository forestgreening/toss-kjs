import { describe, it, expect } from 'vitest';
import { eventStats, personLedger } from '../../src/domain/stats';
import type { LedgerRecord, Person } from '../../src/domain/models';

function rec(p: Partial<LedgerRecord> & { id: string; personId: string; direction: LedgerRecord['direction'] }): LedgerRecord {
  return {
    eventId: 'e1',
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

function person(id: string, name: string): Person {
  return { id, displayName: name, phoneE164: null, phoneRaw: null, status: 'MANUAL', mergedFrom: [], note: null, createdAt: 0, updatedAt: 0 };
}

describe('eventStats — 이벤트 정산 (AC4)', () => {
  const persons = new Map<string, Person>([
    ['p1', person('p1', '김철수')],
    ['p2', person('p2', '이영희')],
    ['p3', person('p3', '박민수')],
    ['p4', person('p4', '최지우')],
  ]);

  it('총액/건수/평균/Top3 정확 계산, 선물(금액 null)·삭제 제외', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 100000 }),
      rec({ id: 'r2', personId: 'p2', direction: 'RECEIVED', amount: 50000 }),
      rec({ id: 'r3', personId: 'p3', direction: 'RECEIVED', amount: 30000 }),
      rec({ id: 'r4', personId: 'p4', direction: 'RECEIVED', amount: 20000 }),
      rec({ id: 'r5', personId: 'p1', direction: 'RECEIVED', amount: null, giftName: '화환' }), // 선물(금액 없음) → 제외
      rec({ id: 'r8', personId: 'p1', direction: 'RECEIVED', amount: 999, giftName: '선물세트' }), // 선물(추정금액 있어도) → 제외
      rec({ id: 'r6', personId: 'p2', direction: 'RECEIVED', amount: 999999, deletedAt: 1 }), // 삭제 → 제외
      rec({ id: 'r7', personId: 'p1', direction: 'GIVEN', amount: 70000 }), // 다른 방향 → 제외
    ];
    const s = eventStats(records, persons);
    expect(s.total).toBe(200000);
    expect(s.count).toBe(4);
    expect(s.average).toBe(50000);
    expect(s.top.map((t) => [t.personId, t.sum])).toEqual([
      ['p1', 100000],
      ['p2', 50000],
      ['p3', 30000],
    ]);
    expect(s.top[0]!.name).toBe('김철수');
  });

  it('빈 입력 → 0/0/0/[]', () => {
    const s = eventStats([], persons);
    expect(s).toEqual({ total: 0, count: 0, average: 0, top: [] });
  });
});

describe('personLedger — 사람 net (AC5)', () => {
  it('받은 합 − 준 합 = net, 삭제·선물 제외', () => {
    const records: LedgerRecord[] = [
      rec({ id: 'r1', personId: 'p1', direction: 'RECEIVED', amount: 100000 }),
      rec({ id: 'r2', personId: 'p1', direction: 'GIVEN', amount: 30000 }),
      rec({ id: 'r3', personId: 'p1', direction: 'GIVEN', amount: 20000 }),
      rec({ id: 'r4', personId: 'p1', direction: 'RECEIVED', amount: null, giftName: '선물' }),
      rec({ id: 'r5', personId: 'p1', direction: 'RECEIVED', amount: 500000, deletedAt: 2 }),
      rec({ id: 'r6', personId: 'p2', direction: 'RECEIVED', amount: 10000 }), // 다른 사람
    ];
    const l = personLedger(records, 'p1');
    expect(l.receivedSum).toBe(100000);
    expect(l.givenSum).toBe(50000);
    expect(l.net).toBe(50000);
  });
});
