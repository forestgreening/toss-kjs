import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { personRepo } from '../../src/data/repositories/personRepo';
import { eventRepo } from '../../src/data/repositories/eventRepo';
import { recordRepo } from '../../src/data/repositories/recordRepo';
import { exportDataset, replaceAll } from '../../src/data/backupStore';
import { exportData, importData } from '../../src/domain/backup';
import { eventStats } from '../../src/domain/stats';
import type { Person, EventRec, LedgerRecord } from '../../src/domain/models';

function person(id: string, name: string, phone: string | null = null): Person {
  return { id, displayName: name, phoneE164: phone, phoneRaw: null, status: 'MANUAL', mergedFrom: [], note: null, createdAt: 1, updatedAt: 1 };
}
function ev(id: string): EventRec {
  return { id, type: 'WEDDING', title: '내 결혼식', ownerSide: 'MINE', date: 100, createdAt: 1, updatedAt: 1 };
}
function rec(id: string, personId: string, amount: number): LedgerRecord {
  return { id, eventId: 'e1', personId, direction: 'RECEIVED', amount, giftName: null, date: 100, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 };
}

beforeEach(async () => {
  await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
});

describe('Dexie 저장소 (data layer)', () => {
  it('CRUD + 재조회로 데이터가 저장소에 보존됨', async () => {
    await personRepo.put(person('p1', '김철수', '+821012345678'));
    await eventRepo.put(ev('e1'));
    await recordRepo.put(rec('r1', 'p1', 100000));

    expect((await personRepo.get('p1'))?.displayName).toBe('김철수');
    expect(await personRepo.byPhone('+821012345678')).toMatchObject({ id: 'p1' });
    expect((await recordRepo.byEvent('e1')).map((r) => r.id)).toEqual(['r1']);
    expect((await recordRepo.byPerson('p1')).length).toBe(1);
  });

  it('putMany 연속 저장이 순서대로 모두 반영', async () => {
    await recordRepo.putMany([rec('r1', 'p1', 10000), rec('r2', 'p1', 20000), rec('r3', 'p1', 30000)]);
    expect((await recordRepo.all()).length).toBe(3);
  });

  it('eventStats가 저장된 기록 위에서 정확히 계산(통합)', async () => {
    await personRepo.put(person('p1', '김철수'));
    await personRepo.put(person('p2', '이영희'));
    await recordRepo.putMany([rec('r1', 'p1', 100000), rec('r2', 'p2', 50000)]);

    const persons = new Map((await personRepo.all()).map((p) => [p.id, p]));
    const stats = eventStats(await recordRepo.byEvent('e1'), persons);
    expect(stats.total).toBe(150000);
    expect(stats.count).toBe(2);
    expect(stats.top[0]).toMatchObject({ personId: 'p1', sum: 100000, name: '김철수' });
  });

  it('AC11: export → wipe → import 왕복이 머지그래프·FK 보존(저장소 경유)', async () => {
    await personRepo.put({ ...person('p1', '김철수', '+821012345678'), mergedFrom: ['p2', 'p0'] });
    await eventRepo.put(ev('e1'));
    await recordRepo.put(rec('r1', 'p1', 100000));

    const file = exportData(await exportDataset(), 999);

    // 앱 wipe 시뮬레이션
    await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
    expect((await personRepo.all()).length).toBe(0);

    // 복원
    await replaceAll(importData(file));

    const restored = await personRepo.get('p1');
    expect(restored?.mergedFrom).toEqual(['p2', 'p0']);
    expect((await recordRepo.get('r1'))?.personId).toBe('p1');
    expect((await exportDataset()).records.length).toBe(1);
  });
});
