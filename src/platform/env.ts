// 실행 환경 감지.
//  - 동기 UA 휴리스틱(`isTossWebView`)으로 UI 노출(연락처 버튼 등)을 게이트한다.
//    실제 SDK 호출은 항상 try/catch로 감싸므로, 감지가 빗나가도 안전하게 폴백된다.
//  - 정밀 환경값('toss' | 'sandbox')이 필요하면 SDK의 getOperationalEnvironment를 쓰되,
//    토스 외부에서 throw할 수 있어 비동기·방어적으로만 사용한다.
import { loadSdk } from './sdk';

/** 토스 WebView 안에서 실행 중인지(동기, 휴리스틱). */
export function isTossWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /toss/i.test(navigator.userAgent);
}

/** 정밀 환경. 토스 밖이거나 SDK 부재면 'web'. */
export async function operationalEnv(): Promise<'toss' | 'sandbox' | 'web'> {
  const sdk = await loadSdk();
  if (!sdk?.getOperationalEnvironment) return 'web';
  try {
    return sdk.getOperationalEnvironment();
  } catch {
    return 'web';
  }
}
