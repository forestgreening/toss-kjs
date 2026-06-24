// 데모용 예시 데이터. 빈 상태에서 "예시로 둘러보기"로 주입 → 정산/Top/평생장부/힌트를 즉시 체험.
// 설정 > 전체 초기화로 깨끗이 지울 수 있다.

import { personRepo } from './repositories/personRepo';
import { eventRepo } from './repositories/eventRepo';
import { recordRepo } from './repositories/recordRepo';
import { newId } from '../lib/id';
import type { EventRec, LedgerRecord, Person } from '../domain/models';

const DAY = 86_400_000;

export async function seedSample(now: number): Promise<void> {
  // 내 결혼식 (받은 정산 데모)
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

  const guests: Array<{ name: string; phone: string | null; amt: number; note: string | null }> = [
    { name: '김철수', phone: '+821011112222', amt: 100000, note: '대학 동기' },
    { name: '이영희', phone: '+821022223333', amt: 50000, note: null },
    { name: '박민수', phone: null, amt: 200000, note: '회사 팀장님' },
    { name: '최지우', phone: null, amt: 30000, note: null },
  ];

  const ids: Record<string, string> = {};
  for (const g of guests) {
    const pid = newId();
    ids[g.name] = pid;
    const person: Person = {
      id: pid,
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
    const r: LedgerRecord = {
      id: newId(),
      eventId: ev.id,
      personId: pid,
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
  }

  // 내가 보낸 기록(평생 장부 net 데모): 김철수 결혼식에 보냄
  await recordRepo.put({
    id: newId(),
    eventId: null,
    personId: ids['김철수']!,
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
  });

  // 선물 기록 데모(현금 아님): 박민수 돌잔치에 선물
  await recordRepo.put({
    id: newId(),
    eventId: null,
    personId: ids['박민수']!,
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
  });
}
