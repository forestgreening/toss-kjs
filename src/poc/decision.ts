// Phase 0 결정 로직 (계획서 §3 Phase 0 결정표 + 글로벌 KILL/ABORT 게이트)
//  - PoC 측정 결과(Phase0Results)를 받아 go/no-go 판정을 산출한다.
//  - 결정 A(E2E 클라우드 백업)를 반영: 로컬 영속이 불가해도 자체 백엔드 호출이
//    가능하면 클라우드 백업이 진실원본이 되어 데이터 유실 위험이 해소된다.
//  - 이 함수는 순수하므로 단위 테스트로 검증된다(SDK 비의존).

export interface ContactsResult {
  /** WebView 빌드에서 fetchContacts가 동작하는가 */
  supported: boolean;
  /** 반환 범위: 전체 연락처 / 토스 가입자만 / 판단 불가(샘플로 사람이 판단) */
  scope: 'full' | 'toss-only' | 'unknown';
  error?: string;
}

export interface PersistenceResult {
  /** navigator.storage.estimate().quota (bytes). 미측정 시 null */
  quotaBytes: number | null;
  /** 앱 재실행(reload) 후 직전 마커가 살아있는가. 미측정 시 null */
  survivesRelaunch: boolean | null;
}

export interface BackendResult {
  /** 미니앱에서 자체 서버로 인증 HTTPS 호출이 도달하는가 (E2E 클라우드 백업의 전제) */
  reachable: boolean;
  error?: string;
}

export interface IdentityResult {
  userKey: string | null;
  anonymousKey: string | null;
  /** 재설치/기기변경에도 동일한가 (수동 2회 측정 필요; 미측정 시 null) */
  anonymousKeyStable: boolean | null;
}

export interface Phase0Results {
  contacts: ContactsResult;
  persistence: PersistenceResult;
  backend: BackendResult;
  identity: IdentityResult;
}

export type Verdict = 'PROCEED' | 'PROCEED_WITH_CLOUD_ONLY' | 'ABORT';

export interface Phase0Evaluation {
  verdict: Verdict;
  contacts: 'feature-on' | 'manual-fallback' | 'manual-only';
  /** primary = 로컬을 주저장소로 신뢰 / cache-only = 로컬은 캐시, 클라우드가 진실원본 */
  localStore: 'primary' | 'cache-only';
  durability: 'local+cloud' | 'cloud-only' | 'at-risk';
  notes: string[];
}

export const MIN_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB (계획서 ② 임계)

export function evaluatePhase0(r: Phase0Results): Phase0Evaluation {
  const notes: string[] = [];

  // ── ① 연락처 ──
  let contacts: Phase0Evaluation['contacts'];
  if (!r.contacts.supported) {
    contacts = 'manual-only';
    notes.push('fetchContacts 미지원(WebView) → 수동 입력만. 연락처 의존 기능은 "RN 전환 필요" 플래그.');
  } else if (r.contacts.scope === 'full') {
    contacts = 'feature-on';
    notes.push('연락처 전체 접근 가능 → 선택 편의 기능 활성화.');
  } else {
    contacts = 'manual-fallback';
    notes.push(`연락처 범위=${r.contacts.scope} → 수동 입력 1순위, 연락처는 보조.`);
  }

  // ── ② 로컬 영속성 ──
  const quotaOk = r.persistence.quotaBytes != null && r.persistence.quotaBytes >= MIN_QUOTA_BYTES;
  const relaunchOk = r.persistence.survivesRelaunch === true;
  let localStore: Phase0Evaluation['localStore'];
  if (relaunchOk && quotaOk) {
    localStore = 'primary';
    notes.push('로컬 영속·용량 충분 → IndexedDB 주저장소.');
  } else {
    localStore = 'cache-only';
    if (!quotaOk) {
      notes.push(`IndexedDB quota 부족/미측정(${r.persistence.quotaBytes ?? 'null'} < 5MB) → 주저장소 부적합.`);
    }
    if (!relaunchOk) {
      notes.push('재실행 후 로컬 데이터 미생존 → 로컬은 캐시로 격하, 진실원본 = 클라우드 백업.');
    }
  }

  // ── 자체 백엔드(E2E 클라우드 백업 가능 여부) — 결정 A의 영속성 해결책 ──
  const backendOk = r.backend.reachable;
  if (backendOk) {
    notes.push('자체 백엔드 호출 가능 → E2E 클라우드 백업으로 기기변경 영속 확보.');
  } else {
    notes.push(`자체 백엔드 호출 불가(${r.backend.error ?? '원인 미상'}) → 클라우드 백업 불가, 데이터 영속 위험.`);
  }

  // ── ③ 식별자 안정성(백업 복원 키) ──
  const idStable = r.identity.anonymousKeyStable === true || r.identity.userKey != null;
  if (!idStable) {
    notes.push('anonymousKey 불안정 + 미로그인 → 백업 복원 키 신뢰 불가(로그인 후 userKey만 사용).');
  }

  // ── durability 종합 ──
  let durability: Phase0Evaluation['durability'];
  if (localStore === 'primary' && backendOk) durability = 'local+cloud';
  else if (backendOk) durability = 'cloud-only';
  else durability = 'at-risk';

  // ── verdict (글로벌 KILL/ABORT 게이트) ──
  let verdict: Verdict;
  if (localStore === 'cache-only' && !backendOk && !idStable) {
    verdict = 'ABORT';
    notes.push('⛔ ABORT: 로컬 영속 불가 + 클라우드 백업 불가 + 식별자 불안정 → 미니앱으로 평생 장부 부적합. 독립앱(자체 백엔드) 재검토.');
  } else if (localStore === 'cache-only' && backendOk) {
    verdict = 'PROCEED_WITH_CLOUD_ONLY';
    notes.push('✅ PROCEED: 로컬은 캐시, 클라우드 백업이 진실원본. 매 실행 복원 UX 설계 필요.');
  } else {
    verdict = 'PROCEED';
    notes.push('✅ PROCEED: 로컬 주저장소 + 클라우드 백업 보강.');
  }

  return { verdict, contacts, localStore, durability, notes };
}
