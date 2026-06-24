// IndexedDB(Dexie) 스키마 (계획서 §4). 스키마버전 필드 포함, 마이그레이션은 비범위.
// 이 파일이 플랫폼 종속 지점(WebView IndexedDB). RN 전환 시 이 레이어만 교체하면
// 도메인/리포지토리 인터페이스는 유지된다(Architect 권고2 — 어댑터 격리).

import Dexie, { type Table } from 'dexie';
import type { Person, EventRec, LedgerRecord } from '../domain/models';

export const SCHEMA_VERSION = 1 as const;

export class LedgerDB extends Dexie {
  persons!: Table<Person, string>;
  events!: Table<EventRec, string>;
  records!: Table<LedgerRecord, string>;

  constructor(name = 'gyeongjosa') {
    super(name);
    // 인덱스: 조회 패턴(전화번호 병합, 사람/이벤트별 기록, 날짜 정렬)에 맞춤
    this.version(SCHEMA_VERSION).stores({
      persons: 'id, phoneE164, displayName',
      events: 'id, date, type',
      records: 'id, personId, eventId, direction, date',
    });
  }
}

export const db = new LedgerDB();
