// 토스 로그인 → userKey 교환 (클라이언트 측).
//  - appLogin()이 준 authorizationCode를 "우리 서버"에 넘겨 userKey를 받는다.
//    (토스 파트너 API 호출 + 시크릿 보관은 서버 몫 — server/README.md 참고. 시크릿을 단말에 두지 않는다.)
//  - userKey는 앱별 고유·안정 식별자 → E2E 클라우드 백업의 "기기변경에도 안정적인 복원 키".
//  - fetch 주입 가능 → 서버 없이도 단위 테스트.
import type { AppLoginResult } from '../platform/identity';

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * authorizationCode를 우리 서버에 보내 userKey로 교환한다.
 * 와이어 규약(server): POST {baseUrl}/auth/login  body={authorizationCode,referrer} → 200 {userKey}
 */
export async function exchangeAuthCode(
  baseUrl: string,
  login: AppLoginResult,
  fetchImpl: FetchLike = fetch,
): Promise<string> {
  if (!baseUrl) throw new AuthError('서버 주소가 설정되지 않았어요.');
  const base = baseUrl.replace(/\/+$/, '');
  let res: Response;
  try {
    res = await fetchImpl(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(login),
    });
  } catch (e) {
    throw new AuthError(`서버에 연결하지 못했어요(${e instanceof Error ? e.message : String(e)}).`);
  }
  if (res.status === 501) {
    throw new AuthError('서버에 토스 로그인 연동이 아직 설정되지 않았어요.');
  }
  if (!res.ok) throw new AuthError(`로그인 교환 실패 (HTTP ${res.status}).`);
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new AuthError('서버 응답을 해석하지 못했어요.');
  }
  const userKey = (data as { userKey?: unknown })?.userKey;
  if (userKey == null || (typeof userKey !== 'string' && typeof userKey !== 'number')) {
    throw new AuthError('서버 응답에 userKey가 없어요.');
  }
  return String(userKey);
}
