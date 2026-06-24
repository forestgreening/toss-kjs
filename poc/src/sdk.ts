// 앱인토스 WebView SDK 어댑터 (feature-detect).
// ⚠️ 설치된 SDK 버전의 실제 export 이름이 다를 수 있습니다.
//    빌드/실행 후 화면의 "SDK가 노출한 함수 목록"을 보고 PKG/함수명을 조정하세요.
//    (목적: fetchContacts / getAnonymousKey / appLogin / getPermission 존재 여부 확인)

import * as AIT from '@apps-in-toss/web-framework';

const api = AIT as unknown as Record<string, unknown>;

export function hasFn(name: string): boolean {
  return typeof api[name] === 'function';
}

export async function callFn<T = unknown>(name: string, ...args: unknown[]): Promise<T> {
  const fn = api[name];
  if (typeof fn !== 'function') throw new Error(`SDK 함수 없음: ${name}`);
  return (await (fn as (...a: unknown[]) => unknown)(...args)) as T;
}

/** SDK가 실제로 노출한 함수 이름들 — 화면에 띄워 실측에 활용 */
export function listFns(): string[] {
  return Object.keys(api)
    .filter((k) => typeof api[k] === 'function')
    .sort();
}
