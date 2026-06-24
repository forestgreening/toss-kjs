// 입력 오케스트레이션: 빠른 입력 1건을 받아 사람 해소(자동병합/신규/제안) 후 기록 저장.
// UI(quick-entry)가 이 함수만 호출하면 된다. SUGGEST(무전화 동명이인)는 사용자 확인이
// 필요하므로 저장하지 않고 결정을 돌려준다(AC3b).

import { personRepo } from './repositories/personRepo';
import { recordRepo } from './repositories/recordRepo';
import { resolvePerson } from '../domain/merge';
import { normalizePhone } from '../domain/phone';
import type { Direction, LedgerRecord, Person } from '../domain/models';

export interface NewEntryInput {
  name: string;
  phoneRaw?: string | null;
  direction: Direction;
  amount?: number | null;
  giftName?: string | null;
  eventId?: string | null;
  date: number;
  now: number;
  /** id 생성기(테스트에서 주입 가능, 실제론 uuid) */
  newId: () => string;
}

export type AddEntryResult =
  | { kind: 'SAVED'; personId: string; recordId: string }
  | { kind: 'NEEDS_MERGE_DECISION'; candidates: Person[]; pending: NewEntryInput };

/** 사람을 해소해 personId를 확정하고(또는 제안 반환) 기록을 저장한다. */
export async function addEntry(input: NewEntryInput): Promise<AddEntryResult> {
  const phoneE164 = normalizePhone(input.phoneRaw);
  const existing = await personRepo.all();
  const decision = resolvePerson(existing, { phoneE164, displayName: input.name });

  if (decision.kind === 'SUGGEST') {
    return { kind: 'NEEDS_MERGE_DECISION', candidates: decision.candidates, pending: input };
  }

  let personId: string;
  if (decision.kind === 'AUTO_MERGE') {
    personId = decision.target.id;
  } else {
    personId = input.newId();
    const p: Person = {
      id: personId,
      displayName: input.name,
      phoneE164,
      phoneRaw: input.phoneRaw ?? null,
      status: 'MANUAL',
      mergedFrom: [],
      note: null,
      createdAt: input.now,
      updatedAt: input.now,
    };
    await personRepo.put(p);
  }

  return saveRecordFor(personId, input);
}

/** SUGGEST 후 사용자가 "같은 사람"으로 확정했을 때: 기존 personId로 저장. */
export async function confirmMergeAndSave(personId: string, input: NewEntryInput): Promise<AddEntryResult> {
  return saveRecordFor(personId, input);
}

/** SUGGEST 후 사용자가 "다른 사람"으로 확정했을 때: 동명이라도 새 Person 생성. */
export async function saveAsNewPerson(input: NewEntryInput): Promise<AddEntryResult> {
  const personId = input.newId();
  await personRepo.put({
    id: personId,
    displayName: input.name,
    phoneE164: normalizePhone(input.phoneRaw),
    phoneRaw: input.phoneRaw ?? null,
    status: 'MANUAL',
    mergedFrom: [],
    note: null,
    createdAt: input.now,
    updatedAt: input.now,
  });
  return saveRecordFor(personId, input);
}

async function saveRecordFor(personId: string, input: NewEntryInput): Promise<AddEntryResult> {
  const recordId = input.newId();
  const record: LedgerRecord = {
    id: recordId,
    eventId: input.eventId ?? null,
    personId,
    direction: input.direction,
    amount: input.amount ?? null,
    giftName: input.giftName ?? null,
    date: input.date,
    source: 'MANUAL',
    memo: null,
    deletedAt: null,
    createdAt: input.now,
    updatedAt: input.now,
  };
  await recordRepo.put(record);
  return { kind: 'SAVED', personId, recordId };
}
