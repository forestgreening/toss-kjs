// 백업 export / import (계획서 §2 AC11)
//  - 로컬 영속 비보장 대비 안전망.
//  - import 는 원본 id 를 그대로 보존하고 FK/mergedFrom 그래프를 무손실 복원한다.
//  - wipe-and-restore 전용: 기존 데이터에 병합하지 않는다(호출 측이 초기화 후 적용).
//  - 스키마 버전: 알 수 없는/미래 버전은 거부(마이그레이션은 현재 비범위).

import type { EventRec, LedgerRecord, Person } from './models';

export const SCHEMA_VERSION = 1 as const;

export interface Dataset {
  persons: Person[];
  events: EventRec[];
  records: LedgerRecord[];
}

export interface BackupFile {
  schemaVersion: number;
  exportedAt: number;
  data: Dataset;
}

export class SchemaVersionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaVersionError';
  }
}

/** 깊은 복제로 id/관계를 원본 그대로 직렬화한다(참조 누수 방지). */
function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function exportData(data: Dataset, exportedAt: number): BackupFile {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt,
    data: deepClone(data),
  };
}

/**
 * 백업을 데이터셋으로 복원한다(wipe-and-restore).
 * id·mergedFrom·personId(FK)를 원본 그대로 보존한다.
 */
export function importData(file: unknown): Dataset {
  if (file == null || typeof file !== 'object') {
    throw new SchemaVersionError('백업 파일 형식이 올바르지 않습니다.');
  }
  const f = file as Partial<BackupFile>;
  if (typeof f.schemaVersion !== 'number') {
    throw new SchemaVersionError('스키마 버전 정보가 없습니다.');
  }
  if (f.schemaVersion > SCHEMA_VERSION) {
    throw new SchemaVersionError(
      `지원하지 않는 미래 버전(${f.schemaVersion})입니다. 앱을 업데이트해 주세요.`,
    );
  }
  if (f.schemaVersion < SCHEMA_VERSION) {
    // 아직 과거 버전이 존재하지 않음 — 알 수 없는 버전으로 거부.
    throw new SchemaVersionError(`알 수 없는 버전(${f.schemaVersion})입니다.`);
  }
  if (!f.data || typeof f.data !== 'object') {
    throw new SchemaVersionError('백업 데이터가 비어 있습니다.');
  }
  const d = f.data as Partial<Dataset>;
  if (!Array.isArray(d.persons) || !Array.isArray(d.events) || !Array.isArray(d.records)) {
    throw new SchemaVersionError('백업 파일 구조가 올바르지 않습니다(사람/경조사/기록 누락).');
  }
  // 각 레코드가 최소한 string id를 갖는지 검증(불량 행이 복원 트랜잭션을 깨뜨리지 않도록)
  const hasValidIds = [...d.persons, ...d.events, ...d.records].every(
    (row) => row && typeof (row as { id?: unknown }).id === 'string',
  );
  if (!hasValidIds) {
    throw new SchemaVersionError('백업 파일에 손상된 항목이 있습니다(id 누락).');
  }
  return deepClone(f.data as Dataset);
}
