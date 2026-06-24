// 데모용 예시 데이터. 빈 상태에서 "예시로 둘러보기"로 주입 → 정산/Top/평생장부/힌트 즉시 체험.
// 주입한 id를 localStorage에 기록해 두고, "예시 지우기"로 예시만 골라 제거(사용자 실데이터는 보존).

import { personRepo } from './repositories/personRepo';
import { eventRepo } from './repositories/eventRepo';
import { recordRepo } from './repositories/recordRepo';
import { newId } from '../lib/id';
import type { EventRec, LedgerRecord, Person } from '../domain/models';

const DAY = 86_400_000;
const SEED_KEY = 'maeum_seed_ids';

interface SeedIds {
  persons: string[];
  events: string[];
  records: string[];
}

export function isSeedActive(): boolean {
  try {
    return !!localStorage.getItem(SEED_KEY);
  } catch {
    return false;
  }
}

/** wipe 등으로 데이터가 사라졌을 때 플래그만 정리(실제 삭제 없이). */
export function forgetSeed(): void {
  try {
    localStorage.removeItem(SEED_KEY);
  } catch {
    /* 무시 */
  }
}

export async function seedSample(now: number): Promise<void> {
  const ids: SeedIds = { persons: [], events: [], records: [] };

  const ev: EventRec = {
    id: newId(),
    type: 'WEDDING',
    title: '내 결혼식',
    ownerSide: 'MINE',
    date: now - 30 * DAY,
    createdAt: now,
    updatedAt: now,
  };
  await eventRepo.put(ev);
  ids.events.push(ev.id);

  const guests: Array<{ name: string; phone: string | null; amt: number; note: string | null }> = [
    { name: '김철수', phone: '+821011112222', amt: 100000, note: '대학 동기' },
    { name: '이영희', phone: '+821022223333', amt: 50000, note: null },
    { name: '박민수', phone: null, amt: 200000, note: '회사 팀장님' },
    { name: '최지우', phone: null, amt: 30000, note: null },
  ];

  const pid: Record<string, string> = {};
  for (const g of guests) {
    const id = newId();
    pid[g.name] = id;
    const person: Person = {
      id,
      displayName: g.name,
      phoneE164: g.phone,
      phoneRaw: g.phone,
      status: 'MANUAL',
      mergedFrom: [],
      note: g.note,
      createdAt: now,
      updatedAt: now,
    };
    await personRepo.put(person);
    ids.persons.push(id);

    const r: LedgerRecord = {
      id: newId(),
      eventId: ev.id,
      personId: id,
      direction: 'RECEIVED',
      amount: g.amt,
      giftName: null,
      date: ev.date,
      source: 'MANUAL',
      occasion: null,
      memo: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await recordRepo.put(r);
    ids.records.push(r.id);
  }

  // 내가 보낸 기록(평생 장부 net 데모): 김철수 결혼식에 보냄
  const given: LedgerRecord = {
    id: newId(),
    eventId: null,
    personId: pid['김철수']!,
    direction: 'GIVEN',
    amount: 100000,
    giftName: null,
    date: now - 400 * DAY,
    source: 'MANUAL',
    occasion: '결혼식',
    memo: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await recordRepo.put(given);
  ids.records.push(given.id);

  // 선물 기록 데모(현금 아님): 박민수 돌잔치에 선물
  const gift: LedgerRecord = {
    id: newId(),
    eventId: null,
    personId: pid['박민수']!,
    direction: 'GIVEN',
    amount: null,
    giftName: '아기 내복 세트',
    date: now - 200 * DAY,
    source: 'MANUAL',
    occasion: '돌잔치',
    memo: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await recordRepo.put(gift);
  ids.records.push(gift.id);

  try {
    localStorage.setItem(SEED_KEY, JSON.stringify(ids));
  } catch {
    /* 무시 */
  }
}

/** 예시 데이터만 골라 삭제(사용자 실데이터는 보존). */
export async function clearSeed(): Promise<void> {
  let ids: SeedIds | null = null;
  try {
    const raw = localStorage.getItem(SEED_KEY);
    if (raw) ids = JSON.parse(raw) as SeedIds;
  } catch {
    ids = null;
  }
  if (ids) {
    for (const id of ids.records) await recordRepo.delete(id);
    for (const id of ids.persons) await personRepo.delete(id);
    for (const id of ids.events) await eventRepo.delete(id);
  }
  forgetSeed();
}
