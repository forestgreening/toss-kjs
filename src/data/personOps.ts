// 사람 정보 수정 + 수동 병합 (번호 변경/중복 대응).
// 도메인의 mergePersons/reassignRecords를 저장소에 적용한다.

import { db } from './db';
import { personRepo } from './repositories/personRepo';
import { recordRepo } from './repositories/recordRepo';
import { mergePersons, reassignRecords } from '../domain/merge';
import { normalizePhone } from '../domain/phone';
import type { Person } from '../domain/models';

/** 이름/전화번호 수정. 전화번호는 입력 시 재정규화. */
export async function editPerson(
  id: string,
  patch: { displayName?: string; phoneRaw?: string | null },
  now: number,
): Promise<void> {
  const p = await personRepo.get(id);
  if (!p) return;
  const phoneGiven = patch.phoneRaw !== undefined;
  const updated: Person = {
    ...p,
    displayName: patch.displayName?.trim() || p.displayName,
    phoneRaw: phoneGiven ? (patch.phoneRaw?.trim() || null) : p.phoneRaw,
    phoneE164: phoneGiven ? normalizePhone(patch.phoneRaw ?? null) : p.phoneE164,
    updatedAt: now,
  };
  await personRepo.put(updated);
}

/**
 * absorbed 사람을 target 사람으로 합친다.
 *  - absorbed의 모든 기록을 target으로 재연결(FK 보존)
 *  - target에 soft merge(mergedFrom에 흡수 이력)
 *  - absorbed 삭제
 * 번호 변경으로 갈라진 동일인을 하나로 되돌릴 때 사용.
 */
export async function mergePeople(targetId: string, absorbedId: string, now: number): Promise<void> {
  if (targetId === absorbedId) return;
  const [target, absorbed] = await Promise.all([personRepo.get(targetId), personRepo.get(absorbedId)]);
  if (!target || !absorbed) return;

  const merged = mergePersons(target, absorbed, now);
  const absorbedRecs = await recordRepo.byPerson(absorbedId);
  const reassigned = reassignRecords(absorbedRecs, absorbedId, targetId, now);

  await db.transaction('rw', db.persons, db.records, async () => {
    await personRepo.put(merged);
    for (const r of reassigned) await recordRepo.put(r);
    await personRepo.delete(absorbedId);
  });
}
