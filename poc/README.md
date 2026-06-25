# 앱인토스 Phase 0 측정 하니스

코딩 본격화 전, 앱인토스 플랫폼의 **불확실한 4가지를 실측**하기 위한 일회용 측정 도구입니다.
이 디렉토리는 메인 앱과 분리되어 있고(루트 tsc/테스트 대상 아님), **당신이 토스 샌드박스에서 직접 실행**합니다.

> ℹ️ probes·`granite.config.ts`는 설치된 `@apps-in-toss/web-framework` **2.9.3 타입에 맞춰 정렬**되어 있고
> `tsc -p poc/tsconfig.json`로 타입체크됩니다(실제 토스 런타임 동작은 샌드박스에서 실측 필요).
> SDK 버전이 바뀌면 import·함수명을 다시 맞추세요. 판정 로직 `src/poc/decision.ts`(evaluatePhase0)는 단위 테스트로 검증됨.

## 측정 항목 (Phase 0 결정표와 1:1)

| # | 프로브 | 측정 | 결정 영향 |
|---|--------|------|-----------|
| ① | `probeContacts` | fetchContacts WebView 지원/반환건수/필드 | 연락처 기능 ON / 수동 폴백 / RN 필요 |
| ② | `probePersistence` | IndexedDB quota + 재실행 생존 | 로컬 주저장소 vs 캐시 격하 |
| — | `probeBackend` | 미니앱→자체 서버 HTTPS 호출 가능? | **E2E 클라우드 백업(결정 A)의 전제** |
| ③ | `probeIdentity` | getAnonymousKey/appLogin 존재·값 | 백업 복원 키 신뢰성 |

## 실행 방법

```bash
cd poc
npm install                 # @apps-in-toss/web-framework 등 (토스 개발자 가이드 선행)
npm run dev                 # 토스 미니앱 개발 모드 — 토스 앱/샌드박스로 연결해 실행
```

> 정확한 부트스트랩/연결 절차는 [앱인토스 WebView 튜토리얼](https://developers-apps-in-toss.toss.im/tutorials/webview.html)을 따르세요.
> SDK 설치 시 자동 생성되는 `granite.config.ts`가 정답이며, 이 저장소의 스텁과 다르면 그쪽을 사용하세요.

## 결과 읽기

화면에 4개 프로브 결과 + **복사용 `Phase0Results` JSON** + "SDK가 노출한 함수 목록"이 뜹니다.

1. **연락처 scope**: 반환 건수를 기기 실제 연락처 수와 비교 → `full`(비슷) / `toss-only`(훨씬 적음)로 JSON의 `contacts.scope` 수정.
2. **영속성 2회차 필수**: 1회차 후 **앱을 완전히 종료하고 다시 열어** 2회차 실행 → `survivesRelaunch`가 채워짐.
   - ⚠️ "기기변경/캐시클리어 생존"은 PoC로 확인 불가 → 결정 A(E2E 클라우드 백업)로 이미 대응.
3. **식별자 안정성**: **앱 삭제→재설치 후** anonymousKey가 같은지 직접 대조 → `anonymousKeyStable` 수정.
4. **백엔드**: 기본 URL은 외부 호출 가능 여부만 본다. 실제로는 **당신의 백엔드 URL로 바꿔 인증 호출**까지 확인.

## 판정 (evaluatePhase0)

완성한 `Phase0Results` JSON을 메인 코드의 검증된 판정 함수에 넣으면 verdict가 나옵니다:

```
PROCEED                  로컬 주저장소 + 클라우드 백업 — 정상 진행
PROCEED_WITH_CLOUD_ONLY  로컬은 캐시, 클라우드 백업이 진실원본 — 진행하되 복원 UX 설계
ABORT                    로컬 영속 불가 + 클라우드 백업 불가 + 식별자 불안정 — 미니앱 부적합, 독립앱 재검토
```

| 조건 | verdict |
|------|---------|
| 로컬 영속 OK + quota≥5MB + 백엔드 OK | PROCEED |
| 로컬 영속 불가지만 **백엔드 OK** | PROCEED_WITH_CLOUD_ONLY (결정 A가 구제) |
| 로컬 영속 불가 + 백엔드 불가 + 식별자 불안정 | ABORT |

> 연락처는 verdict를 좌우하지 않습니다(수동 입력이 코어). `manual-only/fallback/feature-on`만 결정.

## 트러블슈팅

- **`fetchContacts` 없음** → WebView 미지원일 가능성(권한표상 RN 전용). 정상적 발견이며, 연락처 기능은 "RN 필요"로 분리.
- **외부 fetch 차단** → CSP/네트워크 정책 확인. 지속 차단이면 E2E 클라우드 백업 설계 재검토(ABORT 신호일 수 있음).
- **SDK import 에러** → 화면의 "SDK가 노출한 함수 목록"으로 실제 export명을 확인하고 `src/sdk.ts`/`granite.config.ts` 조정.
