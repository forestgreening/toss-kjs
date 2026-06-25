import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/data/db';
import { exportLedgerCsv, importLedgerCsvAppend } from '../../src/data/csvService';
import { addEntry } from '../../src/data/ledgerService';
import { personRepo } from '../../src/data/repositories/personRepo';
import { recordRepo } from '../../src/data/repositories/recordRepo';
import { CSV_HEADERS } from '../../src/domain/csv';

let seq = 0;
const newId = () => `id${++seq}`;
const NOW = new Date(2025, 4, 26).getTime();
const header = CSV_HEADERS.join(',');

beforeEach(async () => {
  seq = 0;
  await Promise.all([db.persons.clear(), db.events.clear(), db.records.clear()]);
});

describe('importLedgerCsvAppend — 기존에 추가', () => {
  it('신규 행: 사람+기록 생성', async () => {
    const text = `${header}\n김철수,010-1234-5678,받음,100000,,결혼식,2025-05-26,동기`;
    const r = await importLedgerCsvAppend(text, NOW, newId);
    expect(r.added).toBe(1);
    expect(r.errors).toEqual([]);
    expect((await personRepo.all()).length).toBe(1);
    expect((await recordRepo.all()).length).toBe(1);
    expect((await personRepo.all())[0]!.phoneE164).toBe('+821012345678');
  });

  it('파일 내 같은 전화번호는 한 사람으로 모음(기록은 각각)', async () => {
    const text = [
      header,
      '김철수,010-1234-5678,받음,100000,,결혼식,2025-05-26,',
      '철수형,+82 10-1234-5678,보냄,50000,,돌잔치,2025-06-01,', // 표기 달라도 같은 번호
    ].join('\n');
    const r = await importLedgerCsvAppend(text, NOW, newId);
    expect(r.added).toBe(2);
    expect((await personRepo.all()).length).toBe(1);
    expect((await recordRepo.all()).length).toBe(2);
  });

  it('기존 사람(같은 전화)에 병합 — 신규 사람 안 만듦', async () => {
    await addEntry({ name: '김철수', phoneRaw: '010-1234-5678', direction: 'RECEIVED', amount: 100000, date: NOW, now: NOW, newId });
    const before = (await personRepo.all()).length;
    expect(before).toBe(1);

    const text = `${header}\n김철수,010-1234-5678,보냄,30000,,생일,2025-06-01,`;
    const r = await importLedgerCsvAppend(text, NOW, newId);
    expect(r.added).toBe(1);
    expect((await personRepo.all()).length).toBe(1); // 병합됨
    expect((await recordRepo.all()).length).toBe(2);
  });

  it('전화번호 없는 동명은 각각 새 사람(안전한 보수적 처리)', async () => {
    const text = [header, '이영희,,받음,50000,,,,', '이영희,,보냄,30000,,,,'].join('\n');
    const r = await importLedgerCsvAppend(text, NOW, newId);
    expect(r.added).toBe(2);
    expect((await personRepo.all()).length).toBe(2);
  });

  it('잘못된 행은 건너뛰고 정상 행만 저장 + 오류 보고', async () => {
    const text = [header, ',,,받음,10000,,,', '정상,,받음,10000,,,2025-01-01,'].join('\n');
    const r = await importLedgerCsvAppend(text, NOW, newId);
    expect(r.added).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect((await recordRepo.all()).length).toBe(1);
  });
});

describe('exportLedgerCsv', () => {
  it('살아있는 기록을 날짜순으로 CSV로(삭제된 건 제외)', async () => {
    await addEntry({ name: '김철수', phoneRaw: '010-1234-5678', direction: 'RECEIVED', amount: 100000, occasion: '결혼식', date: new Date(2025, 0, 2).getTime(), now: NOW, newId });
    await addEntry({ name: '이영희', direction: 'GIVEN', giftName: '내복', amount: null, occasion: '돌잔치', date: new Date(2025, 0, 1).getTime(), now: NOW, newId });

    const csv = await exportLedgerCsv();
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(header);
    // 날짜 오름차순 → 이영희(1/1)가 먼저
    expect(lines[1]).toContain('이영희');
    expect(lines[1]).toContain('보냄');
    expect(lines[1]).toContain('내복');
    expect(lines[2]).toContain('김철수');
    expect(lines[2]).toContain('받음');
    expect(lines[2]).toContain('100000');
  });

  it('내보낸 CSV를 다시 가져오면 동일 건수 복원(왕복)', async () => {
    await addEntry({ name: '박민수', phoneRaw: '010-9999-8888', direction: 'RECEIVED', amount: 200000, occasion: '결혼식', date: NOW, now: NOW, newId });
    const csv = await exportLedgerCsv();

    await Promise.all([db.persons.clear(), db.records.clear()]);
    const r = await importLedgerCsvAppend(csv, NOW, newId);
    expect(r.added).toBe(1);
    expect(r.errors).toEqual([]);
    expect((await recordRepo.all()).length).toBe(1);
    expect((await personRepo.all())[0]!.displayName).toBe('박민수');
  });
});
