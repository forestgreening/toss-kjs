// 백업 상태 추적 + 리마인더 판정. 영속성 비보장 리스크(§6)에 대한 행동 레버.
//  - 마지막 백업 시각은 localStorage에 보관(개인정보 아님, 타임스탬프뿐).
//  - 백업으로 인정: JSON 내보내기 / 엑셀 CSV 내보내기 / 암호화 클라우드 백업 성공.

const KEY = 'maeumjangbu.lastBackupAt';
const DAY = 86_400_000;

/** 백업 성공 시 호출. */
export function markBackedUp(now: number = Date.now()): void {
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    /* 무시 */
  }
}

export function getLastBackupAt(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface ReminderState {
  show: boolean;
  tone: 'warn' | 'info';
  /** UI 문구(show=false면 빈 문자열). */
  text: string;
}

const STALE_DAYS = 7;

/** 리마인더 표시 여부 판정(순수). 기록이 없으면 표시 안 함(잃을 게 없음). */
export function reminderState(
  lastBackupAt: number | null,
  recordCount: number,
  now: number = Date.now(),
): ReminderState {
  if (recordCount <= 0) return { show: false, tone: 'info', text: '' };
  if (lastBackupAt == null) {
    return { show: true, tone: 'warn', text: '아직 백업한 적이 없어요. 기기를 바꾸면 기록이 사라질 수 있어요.' };
  }
  const days = Math.floor((now - lastBackupAt) / DAY);
  if (days >= STALE_DAYS) {
    return { show: true, tone: 'info', text: `마지막 백업이 ${days}일 전이에요. 한 번 백업해두는 걸 권해요.` };
  }
  return { show: false, tone: 'info', text: '' };
}
