// IndexedDB 영속성(휘발 방지) 어댑터. 브라우저/WebView 표준 StorageManager 사용.
//  - persist()로 "캐시 정리 시에도 보존" 모드를 요청. 미지원 환경에선 graceful(false).
//  - 이 앱 최대 리스크(§6: WebView IndexedDB 영속 비보장) 완화의 1차 방어선.
//  - Phase 0 영속성 실측 지점도 겸한다.

/** 영속 저장을 요청(이미 영속이면 true). 미지원/실패 시 false. */
export async function requestPersistence(): Promise<boolean> {
  try {
    const s = navigator.storage;
    if (!s?.persist) return false;
    if (s.persisted && (await s.persisted())) return true;
    return await s.persist();
  } catch {
    return false;
  }
}

/** 현재 영속 모드 여부. 미지원/실패 시 false. */
export async function isPersisted(): Promise<boolean> {
  try {
    const s = navigator.storage;
    if (!s?.persisted) return false;
    return await s.persisted();
  } catch {
    return false;
  }
}
