// 엑셀(CSV) 내보내기/가져오기 — 순수 변환 로직(DB 비의존, 테스트 가능).
// 용도: 초기 세팅 시 사용자가 엑셀로 정리한 이전 경조사 내역을 한 번에 가져오기 + 백업 보조.
// 컬럼: 이름,전화번호,구분,금액,선물,경조사,날짜,메모
//  - 구분: "받음" | "보냄" (비우면 보냄으로 간주)
//  - 금액: 숫자(콤마·"원" 허용). 선물만 있으면 비워둠
//  - 날짜: YYYY-MM-DD (.· / 구분자도 허용). 비우면 가져온 시각의 날짜
// CSV는 RFC4180 따름(콤마/따옴표/줄바꿈 포함 필드는 따옴표로 감싸고 내부 따옴표는 "").
import type { Direction } from './models';

export const CSV_HEADERS = ['이름', '전화번호', '구분', '금액', '선물', '경조사', '날짜', '메모'] as const;

/** 가져오기 1행을 표준화한 결과(저장 입력으로 바로 사용 가능). */
export interface CsvImportRow {
  name: string;
  phoneRaw: string | null;
  direction: Direction;
  amount: number | null;
  giftName: string | null;
  occasion: string | null;
  date: number;
  memo: string | null;
}

/** 내보내기 1행 입력(사람 해소는 호출측에서). */
export interface CsvExportRow {
  name: string;
  phone: string | null;
  direction: Direction;
  amount: number | null;
  giftName: string | null;
  occasion: string | null;
  date: number;
  memo: string | null;
}

export interface CsvParseError {
  /** 사용자 친화 1-based 줄 번호(헤더가 1행). */
  line: number;
  message: string;
}

export interface CsvParseResult {
  rows: CsvImportRow[];
  errors: CsvParseError[];
}

// ── 직렬화 ──

function escapeField(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** 행렬(헤더 포함)을 CSV 텍스트로. 줄바꿈은 CRLF(엑셀 호환). */
export function toCsvText(matrix: string[][]): string {
  return matrix.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

export function directionToKo(d: Direction): string {
  return d === 'RECEIVED' ? '받음' : '보냄';
}

/** epoch(ms) → 'YYYY-MM-DD' (로컬). */
export function formatDate(epoch: number): string {
  const d = new Date(epoch);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function exportRowsToCsv(rows: CsvExportRow[]): string {
  const matrix: string[][] = [Array.from(CSV_HEADERS)];
  for (const r of rows) {
    matrix.push([
      r.name,
      r.phone ?? '',
      directionToKo(r.direction),
      r.amount != null ? String(r.amount) : '',
      r.giftName ?? '',
      r.occasion ?? '',
      formatDate(r.date),
      r.memo ?? '',
    ]);
  }
  return toCsvText(matrix);
}

/** 헤더 + 예시 2행 양식(사용자가 채워 넣도록). */
export function csvTemplate(): string {
  return toCsvText([
    Array.from(CSV_HEADERS),
    ['김철수', '010-1234-5678', '받음', '100000', '', '결혼식', '2025-05-26', '대학 동기'],
    ['이영희', '', '보냄', '', '아기 내복 세트', '돌잔치', '2025-03-01', ''],
  ]);
}

// ── 파싱 ──

/** CSV 텍스트 → 문자열 행렬. 따옴표/CRLF/LF/BOM 처리. */
export function parseCsvMatrix(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 제거
  const out: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\n') {
      row.push(field);
      out.push(row);
      row = [];
      field = '';
      i++;
    } else if (c === '\r') {
      i++; // \r\n 또는 \r 단독 모두 흡수(다음 \n은 위에서 처리)
    } else {
      field += c;
      i++;
    }
  }
  row.push(field);
  out.push(row);
  return out;
}

function koToDirection(s: string): Direction | null {
  const t = s.trim();
  if (t === '') return 'GIVEN'; // 비우면 보냄(앱 기본값 = 내가 낸 것)
  if (t.startsWith('받')) return 'RECEIVED';
  if (t.startsWith('보')) return 'GIVEN';
  return null;
}

/** "100,000" / "100000원" / " 5만 " 류를 숫자로. 숫자 없으면 null. '만' 단위 보정. */
function parseAmount(s: string): { value: number | null; ok: boolean } {
  const t = s.trim();
  if (t === '') return { value: null, ok: true };
  const man = /만/.test(t);
  const digits = t.replace(/[^\d]/g, '');
  if (digits === '') return { value: null, ok: false };
  let n = parseInt(digits, 10);
  if (man && n < 10000) n *= 10000; // "5만" → 50000
  return { value: n, ok: true };
}

/** 'YYYY-MM-DD' / 'YYYY.MM.DD' / 'YYYY/MM/DD' → epoch(로컬 자정). 실패 시 null. */
function parseDate(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const m = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(t);
  if (!m) return null;
  const y = +m[1]!;
  const mo = +m[2]!;
  const d = +m[3]!;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d).getTime();
}

/** CSV 텍스트를 표준화된 가져오기 행으로. 잘못된 행은 errors에 모으고 건너뜀. */
export function parseImport(text: string, defaultDate: number): CsvParseResult {
  const matrix = parseCsvMatrix(text);
  const rows: CsvImportRow[] = [];
  const errors: CsvParseError[] = [];
  if (matrix.length === 0) return { rows, errors };

  // 헤더 매핑(컬럼 순서가 달라도 이름으로 매칭). 별칭 일부 허용.
  const header = matrix[0]!.map((h) => h.trim());
  const idx = (names: string[]): number => header.findIndex((h) => names.includes(h));
  const col = {
    name: idx(['이름', '성함']),
    phone: idx(['전화번호', '연락처', '전화']),
    direction: idx(['구분', '받음/보냄', '종류']),
    amount: idx(['금액', '액수']),
    gift: idx(['선물', '선물명']),
    occasion: idx(['경조사', '행사', '사유']),
    date: idx(['날짜', '일자']),
    memo: idx(['메모', '비고']),
  };
  if (col.name < 0) {
    errors.push({ line: 1, message: "헤더에 '이름' 열이 없어요. 양식을 확인해 주세요." });
    return { rows, errors };
  }

  const cell = (r: string[], c: number): string => (c >= 0 ? (r[c] ?? '').trim() : '');

  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i]!;
    const line = i + 1;
    // 완전 빈 행은 조용히 건너뜀(엑셀 trailing rows)
    if (r.every((v) => v.trim() === '')) continue;

    const name = cell(r, col.name);
    if (name === '') {
      errors.push({ line, message: '이름이 비어 있어요.' });
      continue;
    }
    const direction = koToDirection(cell(r, col.direction));
    if (direction === null) {
      errors.push({ line, message: `구분은 '받음' 또는 '보냄'이어야 해요: "${cell(r, col.direction)}"` });
      continue;
    }
    const amt = parseAmount(cell(r, col.amount));
    if (!amt.ok) {
      errors.push({ line, message: `금액을 숫자로 읽을 수 없어요: "${cell(r, col.amount)}"` });
      continue;
    }
    const giftName = cell(r, col.gift) || null;
    if (amt.value == null && giftName == null) {
      errors.push({ line, message: '금액이나 선물 중 하나는 있어야 해요.' });
      continue;
    }
    const dateStr = cell(r, col.date);
    let date = defaultDate;
    if (dateStr !== '') {
      const parsed = parseDate(dateStr);
      if (parsed == null) {
        errors.push({ line, message: `날짜 형식이 올바르지 않아요(예: 2025-05-26): "${dateStr}"` });
        continue;
      }
      date = parsed;
    }

    rows.push({
      name,
      phoneRaw: cell(r, col.phone) || null,
      direction,
      amount: amt.value,
      giftName,
      occasion: cell(r, col.occasion) || null,
      date,
      memo: cell(r, col.memo) || null,
    });
  }
  return { rows, errors };
}
