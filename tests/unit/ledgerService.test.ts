import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { addEntry, confirmMergeAndSave, type NewEntryInput } from '../../src/data/ledgerService';
import { personRepo } from '../../src/data/repositories/personRepo';
import { recordRepo } from '../../src/data/repositories/recordRepo';

let seq = 0;
const newId = () => `id${++seq}`;

function input(over: Partial<NewEntryInput> = {}): NewEntryInput {
  return { name: '김철수', direction: 'RECEIVED', amount: 50000, date: 100, now: 100, newId, ...over };
}

beforeEach(async () => {
  seq = 0;
  await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
});

describe('addEntry — 입력 오케스트레이션', () => {
  it('신규: 사람+기록 모두 생성', async () => {
    const r = await addEntry(input({ phoneRaw: '010-1234-5678' }));
    expect(r.kind).toBe('SAVED');
    expect((await personRepo.all()).length).toBe(1);
    expect((await recordRepo.all()).length).toBe(1);
    expect((await personRepo.all())[0]!.phoneE164).toBe('+821012345678');
  });

  it('동일 전화번호 재입력: 자동병합(사람 1명, 기록 2건)', async () => {
    await addEntry(input({ phoneRaw: '010-1234-5678', name: '김철수' }));
    await addEntry(input({ phoneRaw: '+82 10-1234-5678', name: '철수형' })); // 표기 달라도 같은 번호
    expect((await personRepo.all()).length).toBe(1);
    expect((await recordRepo.all()).length).toBe(2);
  });

  it('무전화 동명이인: NEEDS_MERGE_DECISION 반환(자동저장 안 함)', async () => {
    await addEntry(input({ name: '이영희' })); // 전화번호 없음 → 신규
    const r = await addEntry(input({ name: '이영희' })); // 같은 이름, 전화 없음
    expect(r.kind).toBe('NEEDS_MERGE_DECISION');
    if (r.kind === 'NEEDS_MERGE_DECISION') {
      expect(r.candidates.length).toBe(1);
      // 아직 두 번째 기록은 저장되지 않음
      expect((await recordRepo.all()).length).toBe(1);
      // 사용자가 "같은 사람" 확정 → 기존 personId로 저장
      const saved = await confirmMergeAndSave(r.candidates[0]!.id, r.pending);
      expect(saved.kind).toBe('SAVED');
      expect((await personRepo.all()).length).toBe(1);
      expect((await recordRepo.all()).length).toBe(2);
    }
  });
});
