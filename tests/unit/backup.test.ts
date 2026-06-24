import { describe, it, expect } from 'vitest';
import {
  exportData,
  importData,
  SchemaVersionError,
  SCHEMA_VERSION,
  type Dataset,
} from '../../src/domain/backup';
import type { Person, EventRec, LedgerRecord } from '../../src/domain/models';

function makeDataset(): Dataset {
  // 병합된 Person 1명 이상 포함 (mergedFrom 그래프 보존 검증용)
  const persons: Person[] = [
    {
      id: 'p1',
      displayName: '김철수',
      phoneE164: '+821012345678',
      phoneRaw: '010-1234-5678',
      status: 'TOSS_LINKED',
      mergedFrom: ['p2', 'p0'], // 병합 흔적
      note: null,
      createdAt: 1,
      updatedAt: 9,
    },
    { id: 'p3', displayName: '이영희', phoneE164: null, phoneRaw: null, status: 'MANUAL', mergedFrom: [], note: null, createdAt: 2, updatedAt: 2 },
  ];
  const events: EventRec[] = [
    { id: 'e1', type: 'WEDDING', title: '내 결혼식', ownerSide: 'MINE', date: 100, createdAt: 1, updatedAt: 1 },
  ];
  const records: LedgerRecord[] = [
    { id: 'r1', eventId: 'e1', personId: 'p1', direction: 'RECEIVED', amount: 100000, giftName: null, date: 100, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 },
    { id: 'r2', eventId: 'e1', personId: 'p3', direction: 'RECEIVED', amount: 50000, giftName: null, date: 100, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 },
  ];
  return { persons, events, records };
}

describe('backup export/import 왕복 무결성 (AC11)', () => {
  it('export → (clear) → import 후 데이터가 완전히 동일(id·FK·mergedFrom 보존)', () => {
    const original = makeDataset();
    const file = exportData(original, 12345);
    // 직렬화/역직렬화 라운드트립(파일 저장 시뮬레이션)
    const restored = importData(JSON.parse(JSON.stringify(file)));
    expect(restored).toEqual(original);
    // 병합 그래프가 바이트 동일하게 보존됨
    expect(restored.persons.find((p) => p.id === 'p1')!.mergedFrom).toEqual(['p2', 'p0']);
    // FK(personId) 원본 그대로
    expect(restored.records.find((r) => r.id === 'r1')!.personId).toBe('p1');
  });

  it('export 는 원본을 깊은 복제(이후 원본 변경이 백업에 영향 없음)', () => {
    const original = makeDataset();
    const file = exportData(original, 1);
    original.persons[0]!.displayName = '변경됨';
    expect(file.data.persons[0]!.displayName).toBe('김철수');
  });

  it('schemaVersion 은 현재 버전으로 기록', () => {
    expect(exportData(makeDataset(), 1).schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('미래 버전은 거부(SchemaVersionError)', () => {
    const file = { schemaVersion: SCHEMA_VERSION + 1, exportedAt: 1, data: makeDataset() };
    expect(() => importData(file)).toThrow(SchemaVersionError);
  });

  it('알 수 없는 과거/잘못된 버전·형식은 거부', () => {
    expect(() => importData({ schemaVersion: 0, exportedAt: 1, data: makeDataset() })).toThrow(SchemaVersionError);
    expect(() => importData(null)).toThrow(SchemaVersionError);
    expect(() => importData({ exportedAt: 1, data: makeDataset() })).toThrow(SchemaVersionError);
  });

  it('구조 손상(배열 누락·id 없음)은 거부 — wipe 전에 막음', () => {
    expect(() => importData({ schemaVersion: 1, exportedAt: 1, data: {} })).toThrow(SchemaVersionError);
    expect(() => importData({ schemaVersion: 1, exportedAt: 1, data: { persons: [{}], events: [], records: [] } })).toThrow(SchemaVersionError);
  });
});
