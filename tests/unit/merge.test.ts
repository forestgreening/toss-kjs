import { describe, it, expect } from 'vitest';
import {
  resolvePerson,
  mergePersons,
  reassignRecords,
} from '../../src/domain/merge';
import type { Person, LedgerRecord } from '../../src/domain/models';

function person(p: Partial<Person> & { id: string; displayName: string }): Person {
  return {
    phoneE164: null,
    phoneRaw: null,
    status: 'MANUAL',
    mergedFrom: [],
    note: null,
    createdAt: 0,
    updatedAt: 0,
    ...p,
  };
}

describe('resolvePerson — 병합 결정 (AC3 / AC3b)', () => {
  it('AC3: 동일 전화번호 → AUTO_MERGE', () => {
    const existing = [person({ id: 'p1', displayName: '김철수', phoneE164: '+821012345678' })];
    const d = resolvePerson(existing, { phoneE164: '+821012345678', displayName: '철수형' });
    expect(d.kind).toBe('AUTO_MERGE');
    if (d.kind === 'AUTO_MERGE') expect(d.target.id).toBe('p1');
  });

  it('전화번호 있으나 일치 없음 → NEW', () => {
    const existing = [person({ id: 'p1', displayName: '김철수', phoneE164: '+821011112222' })];
    const d = resolvePerson(existing, { phoneE164: '+821012345678', displayName: '김철수' });
    expect(d.kind).toBe('NEW');
  });

  it('AC3b: 무전화 동명이인 → SUGGEST(자동병합 금지)', () => {
    const existing = [person({ id: 'p1', displayName: '김철수' })];
    const d = resolvePerson(existing, { phoneE164: null, displayName: '김철수' });
    expect(d.kind).toBe('SUGGEST');
    if (d.kind === 'SUGGEST') {
      expect(d.candidates.map((c) => c.id)).toEqual(['p1']);
    }
  });

  it('AC3b: 무전화 + 다른 이름 → NEW', () => {
    const existing = [person({ id: 'p1', displayName: '김철수' })];
    const d = resolvePerson(existing, { phoneE164: null, displayName: '이영희' });
    expect(d.kind).toBe('NEW');
  });
});

describe('mergePersons — soft merge (hard delete 금지)', () => {
  it('흡수 id를 mergedFrom에 누적, displayName은 target 유지, 전화번호 보강', () => {
    const target = person({ id: 'p1', displayName: '김철수', phoneE164: null });
    const absorbed = person({
      id: 'p2',
      displayName: '철수',
      phoneE164: '+821012345678',
      status: 'TOSS_LINKED',
      mergedFrom: ['p0'],
    });
    const merged = mergePersons(target, absorbed, 100);
    expect(merged.id).toBe('p1');
    expect(merged.displayName).toBe('김철수');
    expect(merged.phoneE164).toBe('+821012345678');
    expect(merged.status).toBe('TOSS_LINKED');
    expect(merged.mergedFrom.sort()).toEqual(['p0', 'p2']);
    expect(merged.updatedAt).toBe(100);
  });
});

describe('reassignRecords — 흡수된 사람의 기록 FK 재연결', () => {
  it('fromId 기록만 toId로 옮기고 나머지는 보존', () => {
    const recs: LedgerRecord[] = [
      { id: 'r1', personId: 'p2', direction: 'RECEIVED', amount: 50000, date: 1, source: 'MANUAL', createdAt: 0, updatedAt: 0 },
      { id: 'r2', personId: 'p9', direction: 'GIVEN', amount: 30000, date: 1, source: 'MANUAL', createdAt: 0, updatedAt: 0 },
    ];
    const out = reassignRecords(recs, 'p2', 'p1', 200);
    expect(out.find((r) => r.id === 'r1')!.personId).toBe('p1');
    expect(out.find((r) => r.id === 'r1')!.updatedAt).toBe(200);
    expect(out.find((r) => r.id === 'r2')!.personId).toBe('p9');
  });
});
