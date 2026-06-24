import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { personRepo } from '../../src/data/repositories/personRepo';
import { recordRepo } from '../../src/data/repositories/recordRepo';
import { deletePerson, deleteRecord, wipeAll } from '../../src/data/erase';
import type { Person, LedgerRecord } from '../../src/domain/models';

function person(id: string): Person {
  return { id, displayName: id, phoneE164: null, phoneRaw: null, status: 'MANUAL', mergedFrom: [], note: null, createdAt: 1, updatedAt: 1 };
}
function rec(id: string, personId: string): LedgerRecord {
  return { id, eventId: 'e1', personId, direction: 'RECEIVED', amount: 10000, giftName: null, date: 1, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 };
}

beforeEach(async () => {
  await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
});

describe('erase — 완전 삭제 (AC13)', () => {
  it('deleteRecord: 해당 기록만 제거', async () => {
    await recordRepo.put(rec('r1', 'p1'));
    await recordRepo.put(rec('r2', 'p1'));
    await deleteRecord('r1');
    expect((await recordRepo.all()).map((r) => r.id)).toEqual(['r2']);
  });

  it('deletePerson: 사람 + 그 사람 기록 모두 제거, 타인은 보존', async () => {
    await personRepo.put(person('p1'));
    await personRepo.put(person('p2'));
    await recordRepo.put(rec('r1', 'p1'));
    await recordRepo.put(rec('r2', 'p2'));
    await deletePerson('p1');
    expect(await personRepo.get('p1')).toBeUndefined();
    expect(await personRepo.get('p2')).toBeDefined();
    expect((await recordRepo.all()).map((r) => r.id)).toEqual(['r2']);
  });

  it('wipeAll: 전부 비움', async () => {
    await personRepo.put(person('p1'));
    await recordRepo.put(rec('r1', 'p1'));
    await wipeAll();
    expect((await personRepo.all()).length).toBe(0);
    expect((await recordRepo.all()).length).toBe(0);
  });
});
