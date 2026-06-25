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
  await clearSeed(); // 이미 둘러보기 중이면 이전 예시를 먼저 정리(중복 누적 방지)
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

  // 사람별 장부를 풍부하게 + 평생 균형(+/−) 데모: 받은/보낸을 섞어 net 다양화
  const more: Array<{
    name: string;
    note: string | null;
    received: number | null; // 내 결혼식에서 받은 금액(없으면 null)
    given: number | null; // 내가 보낸 금액(없으면 null)
    givenOccasion: string | null;
  }> = [
    { name: '윤서연', note: '사촌 언니', received: 100000, given: null, givenOccasion: null },
    { name: '오준호', note: '동호회', received: 50000, given: 30000, givenOccasion: '집들이' },
    { name: '장미경', note: '이모', received: null, given: 50000, givenOccasion: '생일' },
    { name: '한지민', note: '직장 동료', received: 30000, given: 100000, givenOccasion: '결혼식' },
    { name: '정민재', note: '고등학교 친구', received: 50000, given: 150000, givenOccasion: '결혼식' },
  ];

  for (const m of more) {
    const id = newId();
    const person: Person = {
      id,
      displayName: m.name,
      phoneE164: null,
      phoneRaw: null,
      status: 'MANUAL',
      mergedFrom: [],
      note: m.note,
      createdAt: now,
      updatedAt: now,
    };
    await personRepo.put(person);
    ids.persons.push(id);

    if (m.received != null) {
      const r: LedgerRecord = {
        id: newId(),
        eventId: ev.id,
        personId: id,
        direction: 'RECEIVED',
        amount: m.received,
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

    if (m.given != null) {
      const g2: LedgerRecord = {
        id: newId(),
        eventId: null,
        personId: id,
        direction: 'GIVEN',
        amount: m.given,
        giftName: null,
        date: now - 300 * DAY,
        source: 'MANUAL',
        occasion: m.givenOccasion,
        memo: null,
        deletedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await recordRepo.put(g2);
      ids.records.push(g2.id);
    }
  }

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
