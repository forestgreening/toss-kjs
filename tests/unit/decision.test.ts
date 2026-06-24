import { describe, it, expect } from 'vitest';
import { evaluatePhase0, MIN_QUOTA_BYTES, type Phase0Results } from '../../src/poc/decision';

function results(over: Partial<Phase0Results> = {}): Phase0Results {
  return {
    contacts: { supported: true, scope: 'full' },
    persistence: { quotaBytes: MIN_QUOTA_BYTES, survivesRelaunch: true },
    backend: { reachable: true },
    identity: { userKey: 'u1', anonymousKey: 'a1', anonymousKeyStable: true },
    ...over,
  };
}

describe('evaluatePhase0 — Phase 0 결정 로직', () => {
  it('전부 양호 → PROCEED, 로컬 주저장소 + 클라우드', () => {
    const e = evaluatePhase0(results());
    expect(e.verdict).toBe('PROCEED');
    expect(e.localStore).toBe('primary');
    expect(e.durability).toBe('local+cloud');
    expect(e.contacts).toBe('feature-on');
  });

  it('로컬 영속 불가 + 백엔드 가능 → PROCEED_WITH_CLOUD_ONLY (결정 A가 구제)', () => {
    const e = evaluatePhase0(
      results({ persistence: { quotaBytes: 1024, survivesRelaunch: false }, backend: { reachable: true } }),
    );
    expect(e.verdict).toBe('PROCEED_WITH_CLOUD_ONLY');
    expect(e.localStore).toBe('cache-only');
    expect(e.durability).toBe('cloud-only');
  });

  it('로컬 영속 불가 + 백엔드 불가 + 식별자 불안정 → ABORT', () => {
    const e = evaluatePhase0(
      results({
        persistence: { quotaBytes: null, survivesRelaunch: false },
        backend: { reachable: false, error: 'network blocked' },
        identity: { userKey: null, anonymousKey: null, anonymousKeyStable: false },
      }),
    );
    expect(e.verdict).toBe('ABORT');
    expect(e.durability).toBe('at-risk');
  });

  it('로컬 불가 + 백엔드 불가지만 로그인 userKey 있음 → ABORT 아님(식별자 안정)', () => {
    const e = evaluatePhase0(
      results({
        persistence: { quotaBytes: null, survivesRelaunch: false },
        backend: { reachable: false },
        identity: { userKey: 'u1', anonymousKey: null, anonymousKeyStable: false },
      }),
    );
    expect(e.verdict).not.toBe('ABORT');
  });

  it('연락처 미지원 → manual-only (verdict는 영속/백엔드로만 결정)', () => {
    const e = evaluatePhase0(results({ contacts: { supported: false, scope: 'unknown' } }));
    expect(e.contacts).toBe('manual-only');
    expect(e.verdict).toBe('PROCEED');
  });

  it('연락처 토스 가입자만 → manual-fallback', () => {
    const e = evaluatePhase0(results({ contacts: { supported: true, scope: 'toss-only' } }));
    expect(e.contacts).toBe('manual-fallback');
  });

  it('quota가 5MB 경계 미만이면 cache-only', () => {
    const e = evaluatePhase0(
      results({ persistence: { quotaBytes: MIN_QUOTA_BYTES - 1, survivesRelaunch: true } }),
    );
    expect(e.localStore).toBe('cache-only');
  });
});
