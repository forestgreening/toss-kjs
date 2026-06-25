import { useEffect, useRef, useState } from 'react';
import { adsEnabled, attachListBanner, type BannerHandle } from '../platform/ads';

/** 리스트형 인앱 배너. 토스 WebView + 광고 ID 설정 시에만 렌더.
 *  광고가 실제 렌더되기 전/no-fill/실패 시엔 높이 0으로 접혀 빈 공간을 남기지 않는다(미관 보호).
 *  내부 컨테이너는 96px를 유지해 SDK가 정상 렌더할 수 있게 하고, 바깥에서 높이를 접는다. */
export function AdBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!adsEnabled() || !ref.current) return;
    let alive = true;
    let handle: BannerHandle | null = null;
    attachListBanner(ref.current, {
      onRendered: () => alive && setShown(true),
      onNoFill: () => alive && setShown(false),
      onFailed: () => alive && setShown(false),
    }).then((h) => {
      if (!alive) {
        h?.destroy();
        return;
      }
      handle = h;
    });
    return () => {
      alive = false;
      handle?.destroy();
    };
  }, []);

  if (!adsEnabled()) return null;

  return (
    <div
      aria-hidden={!shown}
      style={{
        height: shown ? 96 : 0,
        margin: shown ? '8px 0 0' : 0,
        overflow: 'hidden',
        transition: 'height .2s ease',
      }}
    >
      <div ref={ref} style={{ width: '100%', height: 96 }} />
    </div>
  );
}
