// DB ↔ Dataset 브리지 (계획서 §2 AC11). 도메인의 export/import(backup.ts)는 순수 변환,
// 여기서는 그 Dataset을 IndexedDB에 적용한다. import는 wipe-and-restore 전용.

import { db } from './db';
import type { Dataset } from '../domain/backup';

/** 전체 테이블을 Dataset으로 읽어온다(백업 export 입력). */
export async function exportDataset(): Promise<Dataset> {
  const [persons, events, records] = await Promise.all([
    db.persons.toArray(),
    db.events.toArray(),
    db.records.toArray(),
  ]);
  return { persons, events, records };
}

/** wipe-and-restore: 기존 데이터를 전부 비우고 Dataset을 원본 id 그대로 적재. */
export async function replaceAll(d: Dataset): Promise<void> {
  await db.transaction('rw', db.persons, db.events, db.records, async () => {
    await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
    await Promise.all([
      db.persons.bulkAdd(d.persons),
      db.events.bulkAdd(d.events),
      db.records.bulkAdd(d.records),
    ]);
  });
}
