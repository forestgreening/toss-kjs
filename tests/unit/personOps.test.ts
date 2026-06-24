import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { personRepo } from '../../src/data/repositories/personRepo';
import { recordRepo } from '../../src/data/repositories/recordRepo';
import { editPerson, mergePeople } from '../../src/data/personOps';
import { personLedger } from '../../src/domain/stats';
import type { Person, LedgerRecord } from '../../src/domain/models';

function person(id: string, name: string, phone: string | null = null): Person {
  return { id, displayName: name, phoneE164: phone, phoneRaw: phone, status: 'MANUAL', mergedFrom: [], note: null, createdAt: 1, updatedAt: 1 };
}
function rec(id: string, personId: string, amount: number, dir: LedgerRecord['direction'] = 'GIVEN'): LedgerRecord {
  return { id, eventId: null, personId, direction: dir, amount, giftName: null, date: 1, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 };
}

beforeEach(async () => {
  await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
});

describe('editPerson', () => {
  it('이름·전화번호 수정 + E.164 재정규화', async () => {
    await personRepo.put(person('p1', '김철수'));
    await editPerson('p1', { displayName: '김영수', phoneRaw: '010-9999-8888' }, 50);
    const p = await personRepo.get('p1');
    expect(p?.displayName).toBe('김영수');
    expect(p?.phoneE164).toBe('+821099998888');
    expect(p?.updatedAt).toBe(50);
  });
});

describe('mergePeople — 번호 변경/중복 수동 병합', () => {
  it('흡수된 사람 기록이 target으로 이동, mergedFrom 기록, 흡수 삭제, net 합산', async () => {
    await personRepo.put(person('p1', '김철수', '+821011112222')); // 옛 번호
    await personRepo.put(person('p2', '김철수', '+821033334444')); // 바뀐 번호(같은 사람)
    await recordRepo.put(rec('r1', 'p1', 30000, 'GIVEN'));
    await recordRepo.put(rec('r2', 'p2', 50000, 'GIVEN'));

    await mergePeople('p1', 'p2', 100);

    expect(await personRepo.get('p2')).toBeUndefined();
    const p1 = await personRepo.get('p1');
    expect(p1?.mergedFrom).toContain('p2');
    // 기록 둘 다 p1로
    expect((await recordRepo.byPerson('p1')).map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    expect((await recordRepo.byPerson('p2')).length).toBe(0);
    // net 합산
    const ledger = personLedger(await recordRepo.all(), 'p1');
    expect(ledger.givenSum).toBe(80000);
  });

  it('자기 자신과 병합은 무시', async () => {
    await personRepo.put(person('p1', '김철수'));
    await mergePeople('p1', 'p1', 100);
    expect(await personRepo.get('p1')).toBeDefined();
  });
});
