import { describe, it, expect } from 'vitest';
import { suggestAmount } from '../../src/domain/hint';
import type { LedgerRecord } from '../../src/domain/models';

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
