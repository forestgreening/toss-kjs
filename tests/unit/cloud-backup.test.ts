import { describe, it, expect } from 'vitest';
import {
  backupToCloud,
  restoreFromCloud,
  uploadEnvelope,
  CloudBackupError,
  type CloudConfig,
  type FetchLike,
} from '../../src/data/cloud-backup';
import { encryptDataset, DecryptError } from '../../src/domain/crypto';
import type { Dataset } from '../../src/domain/backup';

function makeDataset(): Dataset {
  return {
    persons: [
      {
        id: 'p1',
        displayName: '김철수',
        phoneE164: '+821012345678',
        phoneRaw: '010-1234-5678',
        status: 'TOSS_LINKED',
        mergedFrom: ['p2'],
        note: null,
        createdAt: 1,
        updatedAt: 9,
      },
    ],
    events: [
      { id: 'e1', type: 'WEDDING', title: '내 결혼식', ownerSide: 'MINE', date: 100, createdAt: 1, updatedAt: 1 },
    ],
    records: [
      { id: 'r1', eventId: 'e1', personId: 'p1', direction: 'RECEIVED', amount: 100000, giftName: null, date: 100, source: 'MANUAL', memo: null, deletedAt: null, createdAt: 1, updatedAt: 1 },
    ],
  };
}

/** key별 암호문 blob 하나를 보관하는 인메모리 가짜 서버(와이어 규약 준수). */
function makeFakeServer(opts: { failStatus?: number } = {}) {
  const store = new Map<string, string>();
  const calls = { put: 0, get: 0 };
  const fetchImpl: FetchLike = async (url, init) => {
    const method = init?.method ?? 'GET';
    const key = decodeURIComponent(url.split('/backup/')[1] ?? '');
    if (opts.failStatus) return new Response('err', { status: opts.failStatus });
    if (method === 'PUT') {
      calls.put++;
      store.set(key, String(init?.body));
      return new Response(null, { status: 204 });
    }
    // GET
    calls.get++;
    const blob = store.get(key);
    if (blob == null) return new Response('not found', { status: 404 });
    return new Response(blob, { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return { fetchImpl, store, calls };
}

const cfg: CloudConfig = { baseUrl: 'https://backup.example.com', key: 'user-123' };

describe('E2E 클라우드 백업 전송 (결정 A)', () => {
  it('백업 → 복원 왕복이 데이터를 무손실 복원', async () => {
    const srv = makeFakeServer();
    const data = makeDataset();
    await backupToCloud(cfg, data, 'pass', srv.fetchImpl);
    const restored = await restoreFromCloud(cfg, 'pass', srv.fetchImpl);
    expect(restored).toEqual(data);
    expect(srv.calls.put).toBe(1);
    expect(srv.calls.get).toBe(1);
  });

  it('백업이 없으면 복원은 null(404)', async () => {
    const srv = makeFakeServer();
    const restored = await restoreFromCloud(cfg, 'pass', srv.fetchImpl);
    expect(restored).toBeNull();
  });

  it('서버에는 암호문만 저장 — 제3자 평문(이름/전화/경조사) 없음', async () => {
    const srv = makeFakeServer();
    await backupToCloud(cfg, makeDataset(), 'pass', srv.fetchImpl);
    const stored = srv.store.get('user-123')!;
    expect(stored).toBeTruthy();
    expect(stored).not.toContain('김철수');
    expect(stored).not.toContain('821012345678');
    expect(stored).not.toContain('결혼식');
  });

  it('틀린 패스프레이즈는 복원 실패(DecryptError)', async () => {
    const srv = makeFakeServer();
    await backupToCloud(cfg, makeDataset(), 'right', srv.fetchImpl);
    await expect(restoreFromCloud(cfg, 'wrong', srv.fetchImpl)).rejects.toBeInstanceOf(DecryptError);
  });

  it('다른 key는 서로 격리(남의 백업이 보이지 않음)', async () => {
    const srv = makeFakeServer();
    await backupToCloud(cfg, makeDataset(), 'pass', srv.fetchImpl);
    const other = await restoreFromCloud({ ...cfg, key: 'user-999' }, 'pass', srv.fetchImpl);
    expect(other).toBeNull();
  });

  it('업로드 실패는 CloudBackupError', async () => {
    const srv = makeFakeServer({ failStatus: 500 });
    const env = await encryptDataset(makeDataset(), 'pass');
    await expect(uploadEnvelope(cfg, env, srv.fetchImpl)).rejects.toBeInstanceOf(CloudBackupError);
  });

  it('설정 누락(baseUrl/key)이면 CloudBackupError', async () => {
    const srv = makeFakeServer();
    const env = await encryptDataset(makeDataset(), 'pass');
    await expect(uploadEnvelope({ baseUrl: '', key: 'k' }, env, srv.fetchImpl)).rejects.toBeInstanceOf(CloudBackupError);
    await expect(uploadEnvelope({ baseUrl: 'https://x', key: '' }, env, srv.fetchImpl)).rejects.toBeInstanceOf(CloudBackupError);
  });
});
