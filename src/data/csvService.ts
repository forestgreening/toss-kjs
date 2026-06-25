// 엑셀(CSV) 내보내기/가져오기의 DB 연동. 순수 변환은 domain/csv.ts가 담당.
//  - 내보내기: 살아있는 기록을 날짜순으로 CSV 행으로 펼침(사람 이름/전화 해소).
//  - 가져오기: "기존에 추가"(append). 전화번호(E.164)가 같으면 같은 사람으로 자동 병합,
//    없으면 새 사람 생성. 파일 내 같은 번호도 한 사람으로 모음. 잘못된 행은 건너뛰고 보고.
import { personRepo } from './repositories/personRepo';
import { recordRepo } from './repositories/recordRepo';
import { exportDataset } from './backupStore';
import { normalizePhone } from '../domain/phone';
import { exportRowsToCsv, parseImport, type CsvExportRow, type CsvParseError } from '../domain/csv';
import type { LedgerRecord, Person } from '../domain/models';

/** 현재 장부를 CSV 텍스트로(헤더 포함, BOM 없음 — 다운로드 계층에서 붙임). */
export async function exportLedgerCsv(): Promise<string> {
  const { persons, records } = await exportDataset();
  const byId = new Map(persons.map((p) => [p.id, p]));
  const rows: CsvExportRow[] = records
    .filter((r) => !r.deletedAt)
    .sort((a, b) => a.date - b.date)
    .map((r) => {
      const p = byId.get(r.personId);
      return {
        name: p?.displayName ?? '(알 수 없음)',
        phone: p?.phoneRaw ?? p?.phoneE164 ?? null,
        direction: r.direction,
        amount: r.amount ?? null,
        giftName: r.giftName ?? null,
        occasion: r.occasion ?? null,
        date: r.date,
        memo: r.memo ?? null,
      };
    });
  return exportRowsToCsv(rows);
}

export interface CsvImportSummary {
  added: number;
  errors: CsvParseError[];
}

/** CSV를 기존 데이터에 추가(append). 전화번호 기준 자동 병합. */
export async function importLedgerCsvAppend(
  text: string,
  now: number,
  newId: () => string,
): Promise<CsvImportSummary> {
  const { rows, errors } = parseImport(text, now);

  const existing = await personRepo.all();
  const byPhone = new Map<string, string>(); // phoneE164 → personId
  for (const p of existing) if (p.phoneE164) byPhone.set(p.phoneE164, p.id);

  let added = 0;
  for (const row of rows) {
    const phoneE164 = normalizePhone(row.phoneRaw);
    let personId: string;
    if (phoneE164 && byPhone.has(phoneE164)) {
      personId = byPhone.get(phoneE164)!;
    } else {
      personId = newId();
      const person: Person = {
        id: personId,
        displayName: row.name,
        phoneE164,
        phoneRaw: row.phoneRaw,
        status: 'MANUAL',
        mergedFrom: [],
        note: null,
        createdAt: now,
        updatedAt: now,
      };
      await personRepo.put(person);
      if (phoneE164) byPhone.set(phoneE164, personId);
    }

    const record: LedgerRecord = {
      id: newId(),
      eventId: null,
      personId,
      direction: row.direction,
      amount: row.amount,
      giftName: row.giftName,
      date: row.date,
      source: 'MANUAL',
      occasion: row.occasion,
      memo: row.memo,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await recordRepo.put(record);
    added++;
  }

  return { added, errors };
}
