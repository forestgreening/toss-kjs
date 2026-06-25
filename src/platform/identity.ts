// 식별자 어댑터 — 백업 복원 키 / 토스 로그인.
//  - getDeviceKey: 미니앱 고유 익명 키(getAnonymousKey). E2E 클라우드 백업의 복원 키 후보.
//    ⚠️ 기기변경/재설치 시 동일성은 토스가 공식 보장하지 않음 → Phase 0 실측 대상(decision.ts).
//  - requestAppLogin: 토스 인증 로그인. authorizationCode를 서버가 AccessToken과 교환해야
//    userKey를 얻는다(서버 미구현 — 현재는 코드 획득까지만 어댑터로 노출).
//  모든 호출은 토스 밖/SDK 부재에서 안전하게 null 폴백.
import { loadSdk } from './sdk';

/** 미니앱 고유 익명 키(hash). 토스 밖/미지원/오류 시 null. */
export async function getDeviceKey(): Promise<string | null> {
  const sdk = await loadSdk();
  if (!sdk?.getAnonymousKey) return null;
  try {
    const r = await sdk.getAnonymousKey();
    if (r && typeof r === 'object' && r.type === 'HASH') return r.hash;
    return null; // 'ERROR' | undefined(미지원 버전)
  } catch {
    return null;
  }
}

export interface AppLoginResult {
  authorizationCode: string;
  referrer: 'DEFAULT' | 'SANDBOX';
}

/** 토스 인증 로그인. authorizationCode는 서버에서 토큰 교환에 사용. 실패 시 null. */
export async function requestAppLogin(): Promise<AppLoginResult | null> {
  const sdk = await loadSdk();
  if (!sdk?.appLogin) return null;
  try {
    return await sdk.appLogin();
  } catch {
    return null;
  }
}
