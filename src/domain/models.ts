// 경조사 장부 — 핵심 도메인 모델 (계획서 §4)
// 주의: 'Record'는 TS 내장 유틸리티 타입과 충돌하므로 LedgerRecord로 명명한다.

export type PersonStatus = 'CONTACT_PICKED' | 'MANUAL' | 'TOSS_LINKED';

export interface Person {
  id: string;
  displayName: string;
  /** E.164 정규화된 전화번호. soft merge 기준 키. 없을 수 있음(수동 이름 입력). */
  phoneE164?: string | null;
  /** 사용자가 입력한 원본 표기 보존 */
  phoneRaw?: string | null;
  status: PersonStatus;
  /** 병합으로 흡수된 과거 Person id들 (hard delete 금지, 추적용) */
  mergedFrom: string[];
  note?: string | null;
  createdAt: number;
  updatedAt: number;
}

export type EventType =
  | 'WEDDING'
  | 'FUNERAL'
  | 'DOL'
  | 'HOUSEWARMING'
  | 'BIRTHDAY'
  | 'OTHER';

/** 내 경조사(받음) vs 타인 경조사(줌) — direction 기본값 결정 */
export type OwnerSide = 'MINE' | 'OTHERS';

export interface EventRec {
  id: string;
  type: EventType;
  title: string;
  ownerSide: OwnerSide;
  date: number;
  createdAt: number;
  updatedAt: number;
}

export type Direction = 'GIVEN' | 'RECEIVED';

export interface LedgerRecord {
  id: string;
  /** 이벤트 묶음. 평생 장부 단건은 null 허용. */
  eventId?: string | null;
  personId: string;
  direction: Direction;
  /** KRW. 선물(비현금)이면 null. */
  amount?: number | null;
  giftName?: string | null;
  date: number;
  /** TRANSFER_HINT 제거됨 — 송금 자동기록 비범위. 항상 수동. */
  source: 'MANUAL';
  memo?: string | null;
  /** 사용자 erasure(완전 삭제 전 tombstone). 통계/장부에서 제외. */
  deletedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
