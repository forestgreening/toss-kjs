// 앱인토스 인앱 광고(배너) 어댑터.
//  - 토스 WebView 안 + 광고 그룹 ID가 설정된 경우에만 동작. 그 외에는 전부 no-op.
//  - 광고 그룹 ID가 비어 있으면 완전 비활성 → 운영 빌드에 테스트 ID가 노출되지 않게(정책 안전)
//    기본값을 빈 문자열로 둔다. 콘솔에서 사업자/정산 등록 후 발급받은 실제 ID로 교체.
//  - SDK 타입(버전별 상이)에 결합하지 않도록 최소 인터페이스로 캐스팅한다.
//  - ⚠️ 부고/장례 맥락·입력(빠른 기록) 화면엔 배너를 두지 않는다(프로젝트 §4).
import { isTossWebView } from './env';
import { loadSdk } from './sdk';

/** 리스트형 배너 광고 그룹 ID. 빈 값이면 광고 비활성.
 *  로컬/샌드박스 미리보기 땐 일시적으로 'ait-ad-test-banner-id'로 바꿔 확인(운영엔 빈 값 유지). */
export const BANNER_AD_GROUP_ID = '';

export interface BannerHandle {
  destroy: () => void;
}

export interface AttachBannerOpts {
  onRendered?: () => void;
  onNoFill?: () => void;
  onFailed?: () => void;
}

// SDK의 TossAds 최소 형태(버전 독립).
interface TossAdsLike {
  initialize: ((arg: {
    callbacks: { onInitialized: () => void; onInitializationFailed: (e?: unknown) => void };
  }) => void) & { isSupported?: () => boolean };
  attachBanner: (
    adGroupId: string,
    target: HTMLElement,
    options?: unknown,
  ) => BannerHandle | undefined;
}

function getAds(sdk: unknown): TossAdsLike | null {
  const ads = (sdk as { TossAds?: TossAdsLike } | null)?.TossAds;
  return ads && typeof ads.attachBanner === 'function' ? ads : null;
}

/** 광고를 쓸 수 있는 환경인가(동기 게이트). 토스 WebView + ID 설정됨. */
export function adsEnabled(): boolean {
  return isTossWebView() && BANNER_AD_GROUP_ID.length > 0;
}

let initPromise: Promise<boolean> | null = null;

async function ensureInitialized(): Promise<boolean> {
  if (!adsEnabled()) return false;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ads = getAds(await loadSdk());
    if (!ads?.initialize) return false;
    try {
      if (ads.initialize.isSupported && !ads.initialize.isSupported()) return false;
    } catch {
      /* isSupported 미존재 — 진행 */
    }
    return new Promise<boolean>((resolve) => {
      try {
        ads.initialize({
          callbacks: {
            onInitialized: () => resolve(true),
            onInitializationFailed: () => resolve(false),
          },
        });
      } catch {
        resolve(false);
      }
    });
  })();
  return initPromise;
}

/** 컨테이너 엘리먼트에 리스트형 배너를 붙인다. 미지원/실패 시 콜백 통지 후 null. */
export async function attachListBanner(
  el: HTMLElement,
  opts: AttachBannerOpts = {},
): Promise<BannerHandle | null> {
  if (!(await ensureInitialized())) {
    opts.onFailed?.();
    return null;
  }
  const ads = getAds(await loadSdk());
  if (!ads) {
    opts.onFailed?.();
    return null;
  }
  try {
    const handle = ads.attachBanner(BANNER_AD_GROUP_ID, el, {
      theme: 'auto',
      tone: 'blackAndWhite',
      variant: 'expanded',
      callbacks: {
        onAdRendered: () => opts.onRendered?.(),
        onNoFill: () => opts.onNoFill?.(),
        onAdFailedToRender: () => opts.onFailed?.(),
      },
    });
    return handle ?? null;
  } catch {
    opts.onFailed?.();
    return null;
  }
}
