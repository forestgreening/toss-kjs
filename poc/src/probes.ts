// Phase 0 측정 프로브 4종. 각 프로브는 (a) 결정 로직용 정규화 결과와
// (b) 사람이 판단할 raw 샘플을 함께 반환한다. 모든 호출은 방어적으로 감싼다.
//
// 정규화 결과 타입은 src/poc/decision.ts 의 Phase0Results 와 1:1 매칭된다.

import { hasFn, callFn, listFns } from './sdk';

export interface ProbeOutput<T> {
  result: T; // decision.ts 입력으로 들어갈 정규화 값
  raw: unknown; // 화면 표시용 원본/진단
  humanCheck?: string; // 사람이 직접 판단해야 하는 부분 안내
}

// ── ① 연락처 ──
export async function probeContacts(): Promise<
  ProbeOutput<{ supported: boolean; scope: 'full' | 'toss-only' | 'unknown'; error?: string }>
> {
  if (!hasFn('fetchContacts')) {
    return {
      result: { supported: false, scope: 'unknown', error: 'fetchContacts export 없음(WebView 미지원 추정)' },
      raw: { sdkFns: listFns() },
      humanCheck: 'SDK 함수 목록에 fetchContacts가 정말 없는지 확인. 없으면 연락처 기능은 RN 전환 필요.',
    };
  }
  try {
    // 권한 요청(있으면)
    if (hasFn('openPermissionDialog')) {
      try { await callFn('openPermissionDialog', { name: 'contacts', access: 'read' }); } catch { /* 무시 */ }
    }
    // 실제 시그니처: fetchContacts({ size, offset }) → { result, nextOffset, done }
    const res = await callFn<{ result?: unknown[]; nextOffset?: number | null; done?: boolean }>(
      'fetchContacts',
      { size: 50, offset: 0 },
    );
    const list = Array.isArray(res?.result) ? res.result : [];
    const sample = list.slice(0, 2);
    const count = list.length;
    return {
      result: { supported: true, scope: 'unknown' }, // 전체 vs 가입자만은 사람이 판단
      raw: {
        count,
        nextOffset: res?.nextOffset ?? null,
        done: res?.done ?? null,
        sampleFields: list[0] ? Object.keys(list[0] as object) : [],
        sample,
      },
      humanCheck:
        `첫 페이지 ${count}건(size=50). 기기 실제 연락처 수와 비교하라: ` +
        `비슷하면 scope=full, 훨씬 적으면 scope=toss-only. decision 입력의 scope를 수동 수정. ` +
        `done=false면 nextOffset으로 더 가져올 수 있다.`,
    };
  } catch (e) {
    return {
      result: { supported: true, scope: 'unknown', error: String(e) },
      raw: { error: String(e) },
      humanCheck: '권한 거부/에러일 수 있음. 권한 허용 후 재시도.',
    };
  }
}

// ── ② 로컬 영속성 (IndexedDB quota + 재실행 생존) ──
const DB_NAME = 'poc-persist';
const STORE = 'kv';

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGet(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function idbPut(db: IDBDatabase, key: string, val: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function probePersistence(): Promise<
  ProbeOutput<{ quotaBytes: number | null; survivesRelaunch: boolean | null }>
> {
  let quotaBytes: number | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    quotaBytes = est?.quota ?? null;
  } catch { /* 무시 */ }

  let survivesRelaunch: boolean | null = null;
  let prior: unknown = null;
  try {
    const db = await idb();
    prior = await idbGet(db, 'marker');
    survivesRelaunch = prior != null ? true : null; // 직전 마커가 있으면 생존
    await idbPut(db, 'marker', { at: Date.now(), note: 'PoC marker' });
  } catch (e) {
    survivesRelaunch = false;
    prior = `error: ${String(e)}`;
  }

  return {
    result: { quotaBytes, survivesRelaunch },
    raw: { quotaBytes, priorMarker: prior },
    humanCheck:
      '⚠️ 1회차엔 survivesRelaunch=null. **앱을 완전히 종료 후 다시 열어** 2회차를 돌려라. ' +
      '2회차에 prior marker가 보이면 세션 영속 OK. 단 "기기변경/캐시클리어" 생존은 PoC로 확인 불가 → 클라우드 백업(결정 A)으로 대응.',
  };
}

// ── 자체 백엔드 호출(E2E 클라우드 백업의 전제) ──
export async function probeBackend(
  url = 'https://httpbin.org/get',
): Promise<ProbeOutput<{ reachable: boolean; error?: string }>> {
  try {
    const res = await fetch(url, { method: 'GET' });
    return {
      result: { reachable: res.ok },
      raw: { url, status: res.status, ok: res.ok },
      humanCheck: `미니앱에서 외부 HTTPS 호출 ${res.ok ? '성공' : '실패'}. 실제로는 너의 백엔드 URL로 바꿔 인증 호출까지 확인하라.`,
    };
  } catch (e) {
    return {
      result: { reachable: false, error: String(e) },
      raw: { url, error: String(e) },
      humanCheck: '외부 호출 차단됐을 수 있음. CSP/네트워크 정책 확인. 차단이면 E2E 클라우드 백업 설계 재검토.',
    };
  }
}

// ── ③ 식별자(getAnonymousKey / appLogin) ──
export async function probeIdentity(): Promise<
  ProbeOutput<{ userKey: string | null; anonymousKey: string | null; anonymousKeyStable: boolean | null }>
> {
  let anonymousKey: string | null = null;
  let userKey: string | null = null;
  const diag: Record<string, unknown> = {};

  if (hasFn('getAnonymousKey')) {
    try {
      // 실제 반환: { type:'HASH', hash } | 'ERROR' | undefined(구버전)
      const r = await callFn<unknown>('getAnonymousKey');
      if (r && typeof r === 'object' && (r as { type?: string }).type === 'HASH') {
        anonymousKey = (r as { hash: string }).hash;
      } else {
        diag.anonRaw = r; // 'ERROR' 또는 undefined(미지원 버전)
      }
    } catch (e) {
      diag.anonError = String(e);
    }
  } else {
    diag.anonNote = 'getAnonymousKey export 없음';
  }

  // 실행 환경(toss/sandbox) — 식별자 해석 보조
  if (hasFn('getOperationalEnvironment')) {
    try {
      diag.operationalEnv = await callFn('getOperationalEnvironment');
    } catch (e) {
      diag.envError = String(e);
    }
  }

  // 직전 실행 anonymousKey와 비교(같은 설치 내 안정성만 확인 가능)
  let anonymousKeyStable: boolean | null = null;
  try {
    const prev = localStorage.getItem('poc_anon');
    if (anonymousKey) {
      if (prev) anonymousKeyStable = prev === anonymousKey;
      localStorage.setItem('poc_anon', anonymousKey);
    }
  } catch { /* 무시 */ }

  diag.loginAvailable = hasFn('appLogin');
  diag.loginNote = 'appLogin은 인터랙티브라 자동 호출 생략. 필요 시 버튼으로 호출해 userKey 확보.';

  return {
    result: { userKey, anonymousKey, anonymousKeyStable },
    raw: diag,
    humanCheck:
      '⚠️ "기기변경/재설치에도 동일"은 PoC 자동측정 불가. **앱 삭제→재설치 후** anonymousKey가 같은지 직접 대조하라. ' +
      '같으면 stable=true(백업 복원 키로 사용 가능).',
  };
}
