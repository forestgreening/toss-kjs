// E2E 클라우드 백업 전송 계층 (결정 A).
//  - 단말에서 domain/crypto.ts로 암호화한 "봉투(BackupEnvelope)"만 서버에 올린다.
//    패스프레이즈는 절대 전송하지 않으므로 운영자도 복호화 불가(E2E).
//  - 서버는 key(=userKey 또는 deviceKey)별로 암호문 blob 하나를 보관할 뿐이다.
//  - fetch를 주입 가능하게 해 서버 없이도 단위 테스트할 수 있다(라운드트립 검증).
//
// 와이어 규약 (server/README.md와 일치):
//   PUT  {baseUrl}/backup/{key}   body=BackupEnvelope(JSON)        → 200/204
//   GET  {baseUrl}/backup/{key}                                    → 200 BackupEnvelope | 404(없음)
//   선택: Authorization: Bearer {token}
import { encryptDataset, decryptDataset, type BackupEnvelope } from '../domain/crypto';
import type { Dataset } from '../domain/backup';

export interface CloudConfig {
  /** 서버 베이스 URL (예: https://backup.example.com) */
  baseUrl: string;
  /** blob 식별자 — 로그인 시 userKey, 아니면 deviceKey(getAnonymousKey hash) */
  key: string;
  /** 선택: 서버 인증 토큰 */
  token?: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class CloudBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CloudBackupError';
  }
}

function endpoint(config: CloudConfig): string {
  if (!config.baseUrl) throw new CloudBackupError('서버 주소가 설정되지 않았어요.');
  if (!config.key) throw new CloudBackupError('백업 식별자(key)가 없어요.');
  const base = config.baseUrl.replace(/\/+$/, '');
  return `${base}/backup/${encodeURIComponent(config.key)}`;
}

function headers(config: CloudConfig): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (config.token) h['authorization'] = `Bearer ${config.token}`;
  return h;
}

const REQUEST_TIMEOUT_MS = 20_000; // 모바일 WebView에서 무한 대기 방지

/** 지원 환경이면 타임아웃 시그널, 아니면 undefined(주입 fetch는 무시). */
function timeoutSignal(ms: number): AbortSignal | undefined {
  try {
    return AbortSignal.timeout?.(ms);
  } catch {
    return undefined;
  }
}

/** 암호문 봉투를 서버에 올린다(덮어쓰기). */
export async function uploadEnvelope(
  config: CloudConfig,
  env: BackupEnvelope,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(endpoint(config), {
      method: 'PUT',
      headers: headers(config),
      body: JSON.stringify(env),
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    throw new CloudBackupError(`서버에 연결하지 못했어요(${e instanceof Error ? e.message : String(e)}).`);
  }
  if (!res.ok) throw new CloudBackupError(`업로드 실패 (HTTP ${res.status}).`);
}

/** 서버에서 암호문 봉투를 가져온다. 백업이 없으면 null. */
export async function downloadEnvelope(
  config: CloudConfig,
  fetchImpl: FetchLike = fetch,
): Promise<BackupEnvelope | null> {
  let res: Response;
  try {
    res = await fetchImpl(endpoint(config), {
      method: 'GET',
      headers: headers(config),
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    throw new CloudBackupError(`서버에 연결하지 못했어요(${e instanceof Error ? e.message : String(e)}).`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new CloudBackupError(`다운로드 실패 (HTTP ${res.status}).`);
  try {
    return (await res.json()) as BackupEnvelope;
  } catch {
    throw new CloudBackupError('서버 응답을 해석하지 못했어요(손상된 백업).');
  }
}

/** 데이터셋을 암호화해 클라우드에 백업한다. */
export async function backupToCloud(
  config: CloudConfig,
  dataset: Dataset,
  passphrase: string,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  const env = await encryptDataset(dataset, passphrase);
  await uploadEnvelope(config, env, fetchImpl);
}

/**
 * 클라우드에서 복원한다. 백업이 없으면 null.
 * 패스프레이즈 불일치/손상 시 crypto의 DecryptError를 그대로 던진다.
 */
export async function restoreFromCloud(
  config: CloudConfig,
  passphrase: string,
  fetchImpl: FetchLike = fetch,
): Promise<Dataset | null> {
  const env = await downloadEnvelope(config, fetchImpl);
  if (!env) return null;
  return decryptDataset(env, passphrase);
}
