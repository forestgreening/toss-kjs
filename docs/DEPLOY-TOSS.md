# 앱인토스(Apps in Toss) 출품 가이드

이 문서는 "마음장부"를 앱인토스 미니앱으로 **번들링 → 콘솔 등록 → 테스트 → 출시**하는 절차다.
코드 측 래핑은 이미 끝나 있고(`granite.config.ts` + SDK 어댑터), 아래는 주로 **콘솔/계정 작업**(사용자 몫)이다.

> 마감: 앱인토스 바이브코딩 챌린지 6/30 첫 번들 등록(출품 목표).

---

## 0. 현재 코드 상태 (이미 완료됨)

- `granite.config.ts` (루트) — 번들 빌드 설정. `appName`, `brand.icon`만 콘솔 값으로 교체 필요(아래 §2).
- `src/platform/sdk.ts` — SDK 동적 로더(브라우저 빌드엔 미포함, 토스에서만 lazy 로드).
- `src/platform/env.ts` — `isTossWebView()` 환경 감지.
- `src/platform/contacts.ts` — 토스 `fetchContacts`(페이지네이션·권한 다이얼로그) + 웹 picker + 수동 폴백.
- `src/platform/identity.ts` — `getDeviceKey()`(=getAnonymousKey, 백업 복원 키 후보), `requestAppLogin()`.
- `src/features/QuickEntry.tsx` — 토스에서 "연락처" 버튼이 자체 목록·검색 바텀시트를 연다.

검증: `npx tsc --noEmit`, `npm test`(52), `npm run build`(브라우저), `npm run bundle`(=`ait build`, `.ait` 생성) 모두 통과.

---

## 1. 빌드/배포 명령

| 명령 | 동작 |
|---|---|
| `npm run dev` | 브라우저 개발 서버(localhost:5173) — UI/로직 개발용 |
| `npm run build` | 순수 Vite 빌드(브라우저/CI 검증용) |
| `npm run bundle` | `ait build` — 앱인토스 배포용 `.ait` 아티팩트 생성(루트에 `maeumjangbu.ait`) |
| `npm run bundle:deploy` | `ait deploy` — 빌드된 `.ait`를 콘솔에 업로드(토큰 필요) |

`.ait`와 `.granite/`는 빌드 산출물 → `.gitignore` 처리됨(커밋 안 함).

---

## 2. 콘솔 등록 (사용자 작업)

1. [앱인토스 콘솔](https://apps-in-toss.toss.im/)에서 미니앱 생성.
   - **카테고리: 생활/유틸리티(가계부)** — 금융 아님. (CLAUDE.md §5 준수)
   - 앱 로고 이미지 업로드 → 이미지 URL 확보.
2. `granite.config.ts` 값 교체:
   - `appName` → 콘솔이 발급한 앱 ID
   - `brand.displayName` → 콘솔 등록명과 **동일하게**
   - `brand.icon` → 위 로고 이미지 URL
3. 토큰 발급: `npx ait token add` (콘솔 시크릿 토큰). `ait deploy`에 필요.

---

## 3. 업로드 → 테스트 → 출시

1. `npm run bundle` → `maeumjangbu.ait` 생성(압축 해제 기준 100MB 이하여야 업로드 가능 — 현재 ~3.8MB).
2. 업로드 두 가지 방법 중 택1:
   - **콘솔**: `.ait` 파일을 콘솔에 드래그 업로드.
   - **CLI**: `npm run bundle:deploy` (= `ait deploy`).
3. 콘솔에서 **QR 생성** → 실제 토스 앱에서 **최소 1회 테스트**(필수).
4. **검토 요청** → 승인 → 출시 (영업일 최대 3일).

---

## 4. 토스 실측이 필요한 항목 (Phase 0 — `src/poc/`, `src/poc/decision.ts`)

코드는 작성됐지만 **샌드박스 실측 전엔 확정 불가**한 가정들:

1. `fetchContacts` 반환 범위 — 전체 기기 연락처 vs 토스 가입자만. (공식 문서 미명시)
2. WebView IndexedDB 영속성 — 캐시클리어/기기변경 시 생존 여부. (토스 FAQ상 비보장)
3. `getAnonymousKey` hash 안정성 — 재설치/기기변경 시 동일성. (공식 보장 없음 → 백업 복원 키로 쓰려면 실측 필수)

→ 실측 결과를 `evaluatePhase0()`에 넣어 `PROCEED` / `PROCEED_WITH_CLOUD_ONLY` / `ABORT` 판정.
   `ABORT`(로컬 영속 불가 + 클라우드 백업 불가 + 식별자 불안정)면 미니앱 중단, 독립앱 재검토.

---

## 5. 미연동(여유분)

- **appLogin → userKey**: `requestAppLogin()`이 `authorizationCode`까지 획득. userKey를 얻으려면
  서버가 토스 API로 토큰 교환(`generate-token` → `login-me`) 해야 함. **서버 미구현**.
- **E2E 클라우드 백업**: `domain/crypto.ts`(완료) + `data/cloud-backup.ts` + 최소 `server/` 미연동.
  복원 키는 `getDeviceKey()`(익명 키) 또는 로그인 후 userKey. §4-3 안정성 실측에 의존.

---

## 참고 — SDK 사실(설치된 @apps-in-toss/web-framework 2.9.3 타입 기준)

- `defineConfig` from `@apps-in-toss/web-framework/config` — 필수: `appName`, `brand{displayName,primaryColor,icon}`, `permissions`, `web{port,commands{dev,build}}`. `webViewProps.type='partner'`(비게임), `appType:'general'`.
- `appLogin(): Promise<{ authorizationCode, referrer: 'DEFAULT'|'SANDBOX' }>`
- `fetchContacts({ size, offset, query?{contains} }): Promise<{ result:{name,phoneNumber}[], nextOffset, done }>` — `.getPermission()` / `.openPermissionDialog()` 동반.
- `getAnonymousKey(): Promise<{ type:'HASH', hash } | 'ERROR' | undefined>` (`undefined`=구버전).
- `getOperationalEnvironment(): 'toss' | 'sandbox'` (토스 밖에선 throw 가능 → 방어적 사용).
- 진입점은 표준 `createRoot(...).render(<App/>)` 그대로(WebView). 별도 Provider/HOC 불필요.
