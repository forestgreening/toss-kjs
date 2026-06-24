import { db } from '../db';
import type { LedgerRecord } from '../../domain/models';

export const recordRepo = {
  put: (r: LedgerRecord): Promise<string> => db.records.put(r),
  get: (id: string): Promise<LedgerRecord | undefined> => db.records.get(id),
  all: (): Promise<LedgerRecord[]> => db.records.toArray(),
  byEvent: (eventId: string): Promise<LedgerRecord[]> =>
    db.records.where('eventId').equals(eventId).toArray(),
  byPerson: (personId: string): Promise<LedgerRecord[]> =>
    db.records.where('personId').equals(personId).toArray(),
  /** 연속 다건 저장: 단건씩 순차 처리(직렬화)로 write 순서 보장 — 계획서 S1.3 */
  putMany: async (rs: LedgerRecord[]): Promise<void> => {
    for (const r of rs) await db.records.put(r);
  },
  delete: (id: string): Promise<void> => db.records.delete(id),
  clear: (): Promise<void> => db.records.clear(),
};
