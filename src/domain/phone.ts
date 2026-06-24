// 전화번호 E.164 정규화 (한국 기준). soft merge 의 안정적 키를 만든다.
// 다양한 표기(010-1234-5678 / +821012345678 / 01012345678 / 공백 포함)를
// 단일 정규형 +8210XXXXXXXX 로 수렴시킨다. 정규화 불가능하면 null.

export function normalizePhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (trimmed.length === 0) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 0) return null;

  let e164: string;
  if (digits.startsWith('82')) {
    // +82... 또는 82... (국가코드 포함)
    e164 = '+' + digits;
  } else if (!hasPlus && digits.startsWith('0')) {
    // 국내 표기 0XX... → 선행 0 제거 후 +82
    e164 = '+82' + digits.slice(1);
  } else {
    // 국가코드도 선행 0도 없으면 키로 신뢰할 수 없음
    return null;
  }

  // +82 + (8~10자리). 한국 휴대폰/유선 범위를 느슨하게 검증.
  if (!/^\+82\d{8,10}$/.test(e164)) return null;
  return e164;
}
