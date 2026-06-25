import { describe, it, expect } from 'vitest';
import { reminderState } from '../../src/data/backupMeta';

const DAY = 86_400_000;
const NOW = 1_000 * DAY;

describe('reminderState — 백업 리마인더 판정', () => {
  it('기록이 없으면 표시 안 함(잃을 게 없음)', () => {
    expect(reminderState(null, 0, NOW).show).toBe(false);
    expect(reminderState(NOW - 30 * DAY, 0, NOW).show).toBe(false);
  });

  it('기록 있고 한 번도 백업 안 했으면 경고(warn)', () => {
    const r = reminderState(null, 5, NOW);
    expect(r.show).toBe(true);
    expect(r.tone).toBe('warn');
  });

  it('마지막 백업이 7일 이상 지나면 info 리마인더', () => {
    const r = reminderState(NOW - 8 * DAY, 5, NOW);
    expect(r.show).toBe(true);
    expect(r.tone).toBe('info');
    expect(r.text).toContain('8일');
  });

  it('최근(7일 미만) 백업했으면 표시 안 함', () => {
    expect(reminderState(NOW - 3 * DAY, 5, NOW).show).toBe(false);
  });

  it('정확히 7일 경계는 표시', () => {
    expect(reminderState(NOW - 7 * DAY, 5, NOW).show).toBe(true);
  });
});
