// 앱인토스 SDK 동적 로더.
//  - 브라우저(비토스) 빌드에 SDK를 정적으로 끌어들이지 않도록 런타임 `import()`로만 로드한다.
//    → 순수 Vite 빌드/테스트는 SDK 무관하게 그대로 동작하고, 실제 호출은 토스 WebView에서만 일어난다.
//  - 타입은 `import type`로만 참조(번들에서 제거됨).
import type * as WebFramework from '@apps-in-toss/web-framework';

export type Sdk = typeof WebFramework;

let cached: Promise<Sdk | null> | null = null;

/** SDK 모듈을 한 번만 동적 로드. 실패(비토스/번들 부재) 시 null. */
export function loadSdk(): Promise<Sdk | null> {
  if (cached) return cached;
  cached = import('@apps-in-toss/web-framework')
    .then((m) => m as unknown as Sdk)
    .catch(() => null);
  return cached;
}
