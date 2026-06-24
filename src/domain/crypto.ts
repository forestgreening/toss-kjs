// E2E 암호화 백업 (계획서 §6 백업, AC14/AC15)
//  - 단말에서 패스프레이즈로 데이터셋을 암호화한 뒤 서버엔 "암호문(봉투)"만 올린다.
//  - 패스프레이즈는 절대 서버로 전송하지 않는다 → 운영자도 복호화 불가(E2E).
//  - 분실 시 복구 불가(E2E의 본질) → UX에서 명확히 경고해야 함.
//  - WebCrypto(SubtleCrypto) 사용: 앱인토스 WebView / Node 모두 지원.

import type { Dataset } from './backup';

const PBKDF2_ITERATIONS = 210_000; // OWASP 권장(PBKDF2-HMAC-SHA256)
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM 표준 nonce 길이

export interface BackupEnvelope {
  v: 1; // 봉투 포맷 버전
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64 (AES-GCM, 인증 태그 포함)
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export class DecryptError extends Error {
  constructor(message = '복호화에 실패했습니다(패스프레이즈 불일치 또는 데이터 손상).') {
    super(message);
    this.name = 'DecryptError';
  }
}

/** 데이터셋을 암호화 봉투로 만든다. 매 호출마다 새 salt/iv를 사용한다. */
export async function encryptDataset(
  data: Dataset,
  passphrase: string,
): Promise<BackupEnvelope> {
  if (!passphrase) throw new Error('패스프레이즈가 필요합니다.');
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ciphertext: toB64(ct),
  };
}

/** 암호화 봉투를 데이터셋으로 복원한다. 패스프레이즈 불일치 시 DecryptError. */
export async function decryptDataset(
  env: BackupEnvelope,
  passphrase: string,
): Promise<Dataset> {
  if (env?.v !== 1) throw new DecryptError('지원하지 않는 백업 봉투 버전입니다.');
  const key = await deriveKey(passphrase, fromB64(env.salt), env.iterations);
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(env.iv) },
      key,
      fromB64(env.ciphertext),
    );
  } catch {
    // AES-GCM 인증 태그 불일치 → 패스프레이즈가 틀렸거나 데이터 손상
    throw new DecryptError();
  }
  return JSON.parse(new TextDecoder().decode(plain)) as Dataset;
}
