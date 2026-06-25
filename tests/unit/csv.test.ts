import { describe, it, expect } from 'vitest';
import {
  parseImport,
  parseCsvMatrix,
  exportRowsToCsv,
  toCsvText,
  csvTemplate,
  CSV_HEADERS,
  type CsvExportRow,
} from '../../src/domain/csv';

const D = new Date(2025, 4, 26).getTime(); // 2025-05-26 로컬

describe('CSV 직렬화', () => {
  it('콤마·따옴표·줄바꿈 포함 필드를 RFC4180으로 이스케이프', () => {
    const out = toCsvText([
      ['a', 'b,c', 'd"e', 'f\ng'],
    ]);
    expect(out).toBe('a,"b,c","d""e","f\ng"');
  });

  it('exportRowsToCsv: 헤더 + 방향 한글화 + 날짜 포맷', () => {
    const rows: CsvExportRow[] = [
      { name: '김철수', phone: '010-1234-5678', direction: 'RECEIVED', amount: 100000, giftName: null, occasion: '결혼식', date: D, memo: '대학 동기' },
      { name: '이영희', phone: null, direction: 'GIVEN', amount: null, giftName: '아기 내복 세트', occasion: '돌잔치', date: D, memo: null },
    ];
    const lines = exportRowsToCsv(rows).split('\r\n');
    expect(lines[0]).toBe(CSV_HEADERS.join(','));
    expect(lines[1]).toBe('김철수,010-1234-5678,받음,100000,,결혼식,2025-05-26,대학 동기');
    expect(lines[2]).toBe('이영희,,보냄,,아기 내복 세트,돌잔치,2025-05-26,');
  });

  it('양식(template)은 헤더 + 예시 2행', () => {
    const lines = csvTemplate().split('\r\n');
    expect(lines[0]).toBe(CSV_HEADERS.join(','));
    expect(lines.length).toBe(3);
  });
});

describe('CSV 행렬 파싱', () => {
  it('따옴표 안의 콤마·줄바꿈·이중따옴표를 보존', () => {
    const m = parseCsvMatrix('a,"b,c","line1\nline2","quote""x"');
    expect(m).toEqual([['a', 'b,c', 'line1\nline2', 'quote"x']]);
  });
  it('BOM과 CRLF 처리', () => {
    const m = parseCsvMatrix('﻿a,b\r\nc,d\r\n');
    expect(m[0]).toEqual(['a', 'b']);
    expect(m[1]).toEqual(['c', 'd']);
  });
});

describe('parseImport — 표준화/검증', () => {
  const header = CSV_HEADERS.join(',');

  it('정상 행을 표준화(방향/금액/날짜/선택값)', () => {
    const text = [
      header,
      '김철수,010-1234-5678,받음,"100,000",,결혼식,2025-05-26,대학 동기',
      '이영희,,보냄,,아기 내복 세트,돌잔치,2025/03/01,',
    ].join('\n');
    const { rows, errors } = parseImport(text, D);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: '김철수',
      phoneRaw: '010-1234-5678',
      direction: 'RECEIVED',
      amount: 100000,
      giftName: null,
      occasion: '결혼식',
      date: D,
      memo: '대학 동기',
    });
    expect(rows[1]).toMatchObject({ name: '이영희', direction: 'GIVEN', amount: null, giftName: '아기 내복 세트' });
  });

  it('구분 비우면 보냄(GIVEN) 기본값', () => {
    const { rows } = parseImport(`${header}\n홍길동,,,50000,,,,`, D);
    expect(rows[0]!.direction).toBe('GIVEN');
  });

  it('"5만" → 50000 보정', () => {
    const { rows } = parseImport(`${header}\n홍길동,,보냄,5만,,,,`, D);
    expect(rows[0]!.amount).toBe(50000);
  });

  it('날짜 비우면 defaultDate 사용', () => {
    const { rows } = parseImport(`${header}\n홍길동,,보냄,30000,,,,`, D);
    expect(rows[0]!.date).toBe(D);
  });

  it('컬럼 순서가 달라도 헤더 이름으로 매핑', () => {
    const { rows, errors } = parseImport('금액,이름,구분\n70000,박민수,받음', D);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ name: '박민수', amount: 70000, direction: 'RECEIVED' });
  });

  it('빈 행은 조용히 건너뜀', () => {
    const { rows, errors } = parseImport(`${header}\n,,,,,,,\n김철수,,받음,10000,,,,`, D);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
  });

  it('오류 행은 건너뛰고 줄번호와 함께 보고', () => {
    const text = [
      header,
      ',,,받음,10000,,,', // 이름 없음 (line 2)
      '김철수,,몰라,10000,,,,', // 잘못된 구분 (line 3)
      '이영희,,보냄,,,,,', // 금액·선물 둘 다 없음 (line 4)
      '박민수,,보냄,abc,,,,', // 금액 숫자 아님 (line 5)
      '최지우,,보냄,10000,,,2025.13.01,', // 잘못된 날짜 (line 6)
      '정상,,받음,10000,,,2025-01-01,', // 정상 (line 7)
    ].join('\n');
    const { rows, errors } = parseImport(text, D);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('정상');
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5, 6]);
  });

  it("헤더에 '이름' 없으면 전체 거부", () => {
    const { rows, errors } = parseImport('성명,금액\n김철수,10000', D);
    expect(rows).toEqual([]);
    expect(errors[0]!.line).toBe(1);
  });
});
