import { describe, it, expect } from 'vitest';
import { encryptDataset, decryptDataset, DecryptError } from '../../src/domain/crypto';
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
        mergedFrom: ['p2', 'p0'],
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

describe('E2E 백업 암호화 (AC14/AC15)', () => {
  it('암호화 → 복호화 왕복이 데이터를 무손실 복원(머지그래프·FK 보존)', async () => {
    const data = makeDataset();
    const env = await encryptDataset(data, 'my-secret-pass');
    const restored = await decryptDataset(env, 'my-secret-pass');
    expect(restored).toEqual(data);
    expect(restored.persons[0]!.mergedFrom).toEqual(['p2', 'p0']);
    expect(restored.records[0]!.personId).toBe('p1');
  });

  it('AC14: 봉투(서버 전송 페이로드)에 제3자 평문(이름/전화)이 없음', async () => {
    const env = await encryptDataset(makeDataset(), 'k');
    const blob = JSON.stringify(env);
    expect(blob).not.toContain('김철수');
    expect(blob).not.toContain('821012345678');
    expect(blob).not.toContain('결혼식');
  });

  it('틀린 패스프레이즈는 복호화 실패(DecryptError)', async () => {
    const env = await encryptDataset(makeDataset(), 'right-pass');
    await expect(decryptDataset(env, 'wrong-pass')).rejects.toBeInstanceOf(DecryptError);
  });

  it('동일 입력도 매번 다른 salt/iv → 다른 암호문(결정적 노출 방지)', async () => {
    const a = await encryptDataset(makeDataset(), 'k');
    const b = await encryptDataset(makeDataset(), 'k');
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.salt).not.toBe(b.salt);
  });

  it('손상된 봉투 버전은 거부', async () => {
    const env = await encryptDataset(makeDataset(), 'k');
    await expect(decryptDataset({ ...env, v: 2 as unknown as 1 }, 'k')).rejects.toBeInstanceOf(DecryptError);
  });
});
