// 사용자 주도 삭제/초기화 (계획서 AC13). 완전 erasure(hard delete) — 내부 merge-tombstone과 구분.
import { db } from './db';
import { personRepo } from './repositories/personRepo';
import { eventRepo } from './repositories/eventRepo';
import { recordRepo } from './repositories/recordRepo';

/** 기록 1건 완전 삭제 → 집계·net에서 즉시 제외. */
export async function deleteRecord(id: string): Promise<void> {
  await recordRepo.delete(id);
}

/** 사람 + 그 사람의 모든 기록 완전 삭제. */
export async function deletePerson(personId: string): Promise<void> {
  const recs = await recordRepo.byPerson(personId);
  await db.transaction('rw', db.persons, db.records, async () => {
    for (const r of recs) await recordRepo.delete(r.id);
    await personRepo.delete(personId);
  });
}

/** 전체 데이터 초기화(로컬 DB 비우기). */
export async function wipeAll(): Promise<void> {
  await db.transaction('rw', db.persons, db.events, db.records, async () => {
    await Promise.all([personRepo.clear(), eventRepo.clear(), recordRepo.clear()]);
  });
}
