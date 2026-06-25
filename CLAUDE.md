# CLAUDE.md — 프로젝트 가이드 (AI 세션용)

이 파일은 새 Claude/AI 세션이 이 저장소를 클론했을 때 **프로젝트 맥락을 즉시 파악**하기 위한 가이드다. 먼저 이 파일을 읽고, 상세는 아래 링크 문서를 참조하라.

---

## 1. 프로젝트 한 줄 요약

**"평생 경조사 주고받기 장부"** — 결혼·장례·돌·집들이·생일 등에서 내가 주고/받은 금액·선물을 빠르게 기록하고, 평생 품앗이(상호부조) 균형을 판단하게 돕는 **로컬 퍼스트 앱인토스(Apps in Toss) 미니앱**.

## 2. 현재 상태 (2026-06-25 기준)

- ✅ 아이디어 정의 + 멀티 에이전트 분석 + ralplan 합의(VERDICT OKAY) 완료
- ✅ **동작하는 React+Vite 앱 완성** (브라우저 모드). 8화면: 홈·빠른입력·내경조사·정산상세·사람별장부·사람상세·백업·설정
  - 기능: 받음/보냄·금액/선물·경조사 태그·메모·날짜·연락처(지원환경)·자동병합/수동합치기·평생 net·적정금액 힌트·JSON 백업·예시 시드(둘러보기/지우기)·전 페이지 홈버튼
  - **고급 리디자인 적용**(Pretendard·파란 hero·아이콘 타일·SVG·카드 그림자) — 디자인 소스 zip은 .gitignore
  - **테스트 102개 통과**(도메인/저장소). `npm run dev`로 실행(localhost:5173~), `npm test`로 검증.
- ✅ **토스 번들 래핑 완료** — `@apps-in-toss/web-framework` 설치, 루트 `granite.config.ts`, SDK 어댑터(연락처 fetchContacts·appLogin·getAnonymousKey), `npm run bundle`(=`ait build`)로 `maeumjangbu.ait` 출품 아티팩트 생성 확인(~3.8MB, RN 0.84/0.72 빌드). 상세 [`docs/DEPLOY-TOSS.md`](./docs/DEPLOY-TOSS.md).
- ✅ **콘솔 등록 + 첫 번들 심사 통과(출시 대기)** — 스토어 노출명 '경조사 마음장부'. 로고(라이트/다크)·썸네일(1932×828)·가로배너(1504×741, 고대비)·세로 스크린샷 3장을 `assets/`에 커밋.
- ✅ **출품 후 앱 개선(이번 세션 2026-06-25, 모두 코드 반영·테스트·시각검증 완료)** — ⚠️ **승인된 번들엔 미포함 → 다음 업데이트로 `npm run bundle` 재빌드·재검토 필요**:
  - `fix(contacts)` 토스 WebView 연락처 SDK 라우팅 / 엑셀(CSV) import·export(초기 세팅 마이그레이션, `domain/csv.ts`·`data/csvService.ts`) / 인앱 배너(휴면 — `platform/ads.ts`의 `BANNER_AD_GROUP_ID` 빈 값) / 영속성 요청(`platform/storage.ts`)+백업 리마인더(`data/backupMeta.ts`) / 이름 자동완성 드롭다운+입력순간 인라인 힌트("지난번 OOO님에게 N원 받았어요", `domain/hint.ts`) / 사람별 장부 검색·필터·'갚을 차례' / 동명이인 새로 추가 시 구분 메모 필수 / FAB·하단 액션바 UI 버그 다수 수정.
- ⏳ **다음**: (출시) 콘솔에서 승인 번들 '출시하기' → 이후 위 개선분 묶어 `npm run bundle` 재업로드·재검토. Phase 0 샌드박스 실측(연락처·영속성·식별자) + 광고 ID 발급(사업자/정산 등록, 검토 2~3일) 후 `ads.ts` `BANNER_AD_GROUP_ID` 교체.
- ⚠️ **마감**: 앱인토스 바이브코딩 챌린지 6/30 첫 번들 등록(출품 목표).
- 🔁 **이월 기능(데이터 모인 MVP 이후)**: 연령대·경조사별 평균 축의금 '시세'(서버 익명 버킷 집계, k-익명성·옵트인·부고 제외, 로컬 퍼스트 준수). 현재 적정금액 힌트는 개인 과거 기준(`suggestAmount`=마지막 받은 단일 금액)뿐. **배경**: "남들은 얼마 내지?"가 한국 사용자 최대 고민이라 멀티에이전트 브레인스토밍에서 차별화 잠재력 1순위로 꼽혔으나, 프라이버시 설계 비용 때문에 출품(6/30) 범위에서 보류(2026-06-25 결정). 재제안 시 위 프라이버시 제약을 반드시 설계에 포함.
- 🛠 **검증 도구 메모**: Playwright는 전역 캐시(`~/AppData/Local/ms-playwright/chromium-1200`)만 있고 프로젝트엔 미설치 — 스크린샷/E2E는 스크래치패드에 `playwright` 설치 후 `chromium.launch({executablePath: <캐시 chrome.exe>})`로 사용. (Mac에선 경로/설치 재확인 필요)

## 3. 읽어야 할 문서 (우선순위 순)

1. [`README.md`](./README.md) — 프로젝트 종합 (아이디어 진화, 플랫폼 결정, 분석, 설계 원칙, 로드맵)
2. [`.omc/plans/gyeongjosa-ledger-mvp.md`](./.omc/plans/gyeongjosa-ledger-mvp.md) — MVP 실행 계획 전문 (요구사항·AC1~AC13·디렉토리 트리·데이터 모델·Phase·리스크·검증)
3. [`.omc/plans/open-questions.md`](./.omc/plans/open-questions.md) — Phase 0 PoC 게이트 및 미결 결정 항목

## 4. 핵심 설계 원칙 (반드시 준수)

1. **로컬 퍼스트** — 제3자 금액·연락처는 기기 로컬(IndexedDB)에만. 서버엔 userKey/익명 카운터만. (개인정보보호법 회피의 핵심)
2. **수동 입력이 코어** — 3초 내 1건 입력 UX가 생명. 연락처는 편의 기능이며 권한 없어도 100% 동작해야 함.
3. **백업 필수 (E2E 암호화 클라우드 — 결정 A)** — 로컬 영속 비보장 → 단말에서 패스프레이즈로 암호화 후 서버엔 **암호문만**(운영자 복호화 불가). 기기변경 복원 + 개인정보 동시 해결. 수동 JSON export/import 보조.
4. **부고는 금액 UI 분리 + 절대 과금 금지.**

## 5. 하지 말 것 (분석으로 배제된 것들 — 다시 제안하지 말 것)

- ❌ **청첩장 만들기/전파/공유 링크** — 레드오션 + 정보통신망법 제50조 스팸 위법.
- ❌ **송금 자동기록** — 앱인토스에 P2P 송금 API/콜백 없음. 송금 딥링크(openURL)도 심사 금지. "자동" 표현 금지.
- ❌ **서버에 제3자 평문(이름/전화/금액) 저장.**
- ❌ UI 카피에 "정산/송금" 사용 — "기록/장부/주고받은 내역"으로. 카테고리는 금융 아닌 생활/유틸리티(가계부).

## 6. 검증되지 않은 플랫폼 가정 (Phase 0에서 실측 필요)

1. `fetchContacts` 전체 연락처 vs 토스 가입자만? **WebView 미지원 가능성**(권한표상 RN 전용).
2. WebView IndexedDB 용량 한도 + 캐시클리어/기기변경 시 영속성 (토스 FAQ상 **비보장**).
3. `userKey`/`getAnonymousKey` 기기변경·재로그인 시 동일성.

→ Phase 0 결과에 따라 **글로벌 KILL/ABORT 게이트** 존재: 영속 불가 + anonymousKey 미안정(+연락처 미지원·심사 제약) 시 → 미니앱 중단, 독립앱 재검토.

## 7. 다음 단계 (앱·번들 래핑 완료 — 남은 건 콘솔/실측/연동)

1. **콘솔 등록 + 업로드(최우선, 사용자 작업)** — 앱인토스 콘솔에서 앱 생성(카테고리=생활/유틸리티) → 로고 업로드 → `granite.config.ts`의 `appName`·`brand.icon`·`brand.displayName`을 콘솔 값으로 교체 → `npx ait token add`(토큰) → `npm run bundle:deploy`(=`ait deploy`) 또는 콘솔에 `maeumjangbu.ait` 업로드 → QR로 토스 앱 테스트 → 검토요청. 전 절차 [`docs/DEPLOY-TOSS.md`](./docs/DEPLOY-TOSS.md).
2. **Phase 0 샌드박스 실측(병렬)** — `poc/` 측정 하니스를 토스에 올려 §6 3가지 실측 → `src/poc/decision.ts`(`evaluatePhase0`)로 go/no-go.
3. **여유분(일부 완료)**: ✅ E2E 암호화 클라우드 백업 **코드 연동 완료** — `data/cloud-backup.ts`(주입형 fetch·타임아웃) + `server/`(의존성 없는 참조 서버) + 백업화면 UI. 남은 건 **서버 호스팅**(사용자)과 키 안정성(Phase 0/로그인 의존). ⏳ appLogin→userKey 토큰교환 서버, 광고(IAA — 부고 제외).

> 코드 래핑 산출물: 루트 `granite.config.ts`, `src/platform/{sdk,env,contacts,identity}.ts`(SDK는 동적 import라 브라우저 빌드 비포함·토스에서만 lazy 로드), `QuickEntry`의 토스 연락처 선택 바텀시트.

### 앱 구조
- `src/domain/` 순수 로직(models·phone·merge·stats·hint·backup·crypto), `src/data/` Dexie 저장소·서비스(ledgerService·personOps·erase·backupStore·seed), `src/features/` 화면, `src/ui/` styles·format·TopBar, `src/app/` App·store.
- `poc/` 토스 측정 하니스(별도, 루트 빌드 외).
- ✅ confirm/alert → 인앱 다이얼로그(`ui/Dialog.tsx`) 전면화 완료. 잔여(출품 비필수): 성능 메모이제이션, 일부 행 시맨틱 button화.

## 8. 기술 스택 (예정)

- 앱인토스 WebView: React + `@apps-in-toss/web-framework` + `granite.config.ts`(필수) → `npm run bundle`(=`ait build`)로 `.ait` 생성 → **콘솔 업로드/`ait deploy`**. (브라우저 검증용 `npm run build`는 순수 Vite로 별도 유지)
- 로컬 저장: IndexedDB(Dexie). 데이터 모델: `Person` / `Event` / `Record` (상세는 계획서 §4)
- E2E 백업: `domain/crypto.ts`(PBKDF2-SHA256 + AES-256-GCM, **구현·테스트 완료**) + `data/cloud-backup.ts` + 최소 `server/`(userKey별 암호문 blob). 패스프레이즈는 서버 미전송, 분실 시 복구 불가.
- 비즈니스 로직(domain/data)을 플랫폼 어댑터와 분리 — 만일의 RN 전환 비용 격리.

## 9. Git 신원 주의

이 저장소는 **`forestgreening <forestgreening@gmail.com>`** 신원으로 커밋한다(로컬 `git config`로 설정됨). 전역 설정과 다를 수 있으니 커밋 전 `git config user.email` 확인.
