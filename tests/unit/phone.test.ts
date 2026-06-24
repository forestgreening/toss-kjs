import { describe, it, expect } from 'vitest';
import { normalizePhone } from '../../src/domain/phone';

// AC3: 동일 전화번호의 다른 표기들이 단일 정규형으로 수렴해야 한다.
describe('normalizePhone — E.164 정규화 (AC3)', () => {
  it('하이픈 표기 010-1234-5678 → +821012345678', () => {
    expect(normalizePhone('010-1234-5678')).toBe('+821012345678');
  });
  it('국제 표기 +821012345678 → 그대로', () => {
    expect(normalizePhone('+821012345678')).toBe('+821012345678');
  });
  it('숫자만 01012345678 → +821012345678', () => {
    expect(normalizePhone('01012345678')).toBe('+821012345678');
  });
  it('공백 표기 010 1234 5678 → +821012345678', () => {
    expect(normalizePhone('010 1234 5678')).toBe('+821012345678');
  });
  it('+82 혼합 표기 "+82 10-1234-5678" → +821012345678', () => {
    expect(normalizePhone('+82 10-1234-5678')).toBe('+821012345678');
  });
  it('빈 값/null → null', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
  it('정규화 불가(국가코드·선행0 없음) → null', () => {
    expect(normalizePhone('1234')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
  });
});
