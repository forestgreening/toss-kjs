# 경조사 주고받기 장부 앱 — MVP 실행 계획

> 플랫폼: 앱인토스(Apps in Toss) 미니앱 · React + `@apps-in-toss/web-framework` (WebView)
> 빌드/배포: `granite.config.ts`(필수) → `npm run build` 번들 → 토스 개발자 콘솔 업로드 (표준 정적호스팅 아님)
> 모드: 그린필드 신규 프로젝트 (빈 디렉토리)
> 작성일: 2026-06-23 · 개정: 2026-06-23 (Architect 자문 반영)

---

## 0. 한 줄 정의

"평생 경조사 주고받기 장부" — 청첩장/전파 기능 없이, **주고받은 기록**을 빠르게 입력·정산하고, 평생 품앗이 균형을 판단하게 돕는 로컬 퍼스트 미니앱.

---

## 1. 요구사항 요약 + 비범위(Out of Scope)

### 1.1 In Scope (MVP)
| # | 요구사항 | 근거 |
|---|---------|------|
| R1 | 경조사 이벤트 생성(결혼/장례/돌/집들이/생일/기타) | 두 축의 컨테이너 |
| R2 | 받은 기록(RECEIVED) 빠른 입력 — 식 직후 정산 시나리오 | 페인 #1 |
| R3 | 준 기록(GIVEN) 입력 — 평생 장부 | 페인 #2(품앗이) |
| R4 | 3초 내 1건 입력 UX (금액/사람/방향) | 코어 경쟁력 |
| R5 | 연락처 선택(fetchContacts) — **옵션이자 RN 전용 가능성**. WebView 미지원으로 가정(기본 꺼짐). 어떤 경우든 100% 수동 동작 | 법무/UX 원칙 + Architect 권고3 |
| R6 | 사람 중복 병합(E.164 전화번호 키 soft merge) | 데이터 품질 |
| R7 | 이벤트별 정산 통계(합계/건수/평균/Top) | 페인 #1 수익화 가치 |
| R8 | 평생 장부 조회: "이 사람에게 받은/준 내역" → 적정 금액 힌트 | 페인 #2 |
| R9 | 로컬 퍼스트 저장(제3자 금액·연락처는 기기 로컬/E2E) | PIPA 회피, 강제 준수 |
| R10 | 토스 로그인(appLogin/userKey) — 식별·백업 인가 키. **서버측 authorizationCode→토큰 교환으로 검증된 userKey만 신뢰** | 인증 + Architect 권고6 |
| R11 | 부고/조의 금액 UI 분리 + 절대 과금 금지 표식 | 윤리·심사 |
| R12 | **수동 데이터 export/import(JSON)** — 로컬 영속 비보장 대응 안전망 | Architect 권고4 (MVP 필수) |
| R13 | **E2E 암호화 클라우드 백업/복원** — 단말에서 패스프레이즈로 암호화 후 서버엔 암호문만 저장. 기기변경·앱삭제에도 새 기기에서 복원. 운영자도 복호화 불가(PIPA·영속성 동시 해결) | 사용자 결정 A (MVP 승격) |

### 1.2 Out of Scope (명시적 비범위)
- 청첩장/부고장 만들기·디자인·전파·공유 링크 (레드오션 + 정보통신망법 스팸 리스크)
- P2P 송금 자동기록/자동 매칭 (앱인토스에 송금 API/콜백 없음 — "자동" 마케팅 금지)
- **송금 딥링크(openURL) 호출** — 토스 커뮤니티 공식 답변상 openURL 송금 딥링크 불허·사용자간 송금 미제공. 자동송금 기록 일체 비범위(MVP source=MANUAL 단일) (Architect 권고7 + Critic)
- 자체 SMS/알림톡 대량 발송 (Phase 0 심사 확인 전까지 금지)
- 서버에 제3자 평문 금액·연락처 저장
- 가족 합산·프리미엄 구독 결제 (수익화 훅만 남김, 미구현) — ※ 클라우드 백업은 결정 A로 In Scope(R13)로 이동
- **비암호화(평문) 서버 백업** — E2E 암호화만 허용. 서버가 읽을 수 있는 형태의 백업 금지
- 커머스(답례품/화환/상품권)·제휴 송객 실제 연동 (자리표시 placeholder만)
- 다국어, 다크모드 외 부가 테마

---

## 2. 측정 가능한 수용 기준(Acceptance Criteria)

각 항목은 pass/fail 가능하며 데모 또는 자동 테스트로 검증한다.

| ID | 수용 기준 (Pass 조건) |
|----|----------------------|
| AC1a | 신규 RECEIVED 1건 입력(사람명 타이핑 + 금액 + 저장)까지 **탭 수 ≤ 4** — 결정적·자동 검증. 측정: 입력 시퀀스 자동 카운트 단위/E2E 테스트(자가 데모 통과 금지). |
| AC1b | **첫 사용자 N≥5명의 1건 입력 소요시간 중앙값 ≤ 3초** — Phase 3 실사용자 측정에 연동(개발자 자가측정으로 통과 금지). 측정: S3.2 실사용자 세션 타임스탬프 중앙값. |
| AC2 | 연락처 미지원/권한 거부 상태에서 앱의 **모든 입력/조회/집계 기능이 100% 동작**(에러·빈화면 없음). 측정: 연락처 비활성 모드 E2E 시나리오 통과. |
| AC3 | 동일 전화번호(다른 표기: 010-1234-5678 / +821012345678 / 01012345678) Person 입력 시 **자동 1명으로 soft merge**, 양쪽 기록이 한 사람 화면에 합쳐짐. 측정: 단위 테스트 6케이스 통과. |
| AC3b | **전화번호 없는 신규 Person**의 displayName이 기존 Person과 일치하면 저장 시 **"같은 사람인가요?" 병합 제안**(자동병합 금지, 사용자 1탭 확인). 확인 시 한 사람으로 합치고 net 수치 오염 방지. 측정: 동명이인 병합제안 단위/E2E 테스트(제안 노출 + 확인 후 병합 + 거부 시 별도 유지 3케이스). |
| AC4 | 이벤트 상세에서 **총 수령액·건수·평균·최고액 기여자 Top3**가 입력 즉시(<200ms) 재계산. 측정: 통계 단위 테스트(수치 정확성) + 100건 데이터에서 **기준 기기(저사양 안드로이드: 토스 미니앱 WebView, 예 Galaxy A 계열 또는 동급) 200ms** 프로파일. 개발 노트북 측정 금지. |
| AC5 | 사람 상세에서 "받은 합계 / 준 합계 / 순(net)"과 **다음 적정 금액 힌트** 표시. 힌트 공식 고정: "해당 사람에게서 가장 최근 RECEIVED 단일 금액"(없으면 미표시). 측정: 규칙 단위 테스트. |
| AC6 | 앱 **세션 내** 종료 후 재실행 시 데이터가 로컬에서 복원(서버 호출 없이). 측정: 동일 세션 재실행 데이터 일치. ⚠️ 앱 삭제·기기변경·캐시클리어 영속은 보장 대상 아님 → AC11 export/import가 안전망. (PoC ②가 영속을 전혀 보장 못하면 AC6는 "세션 한정 + 필수 export"로 강등 — Phase0 결정표 참조) |
| AC7 | 네트워크 페이로드 검사 결과 **제3자 금액·전화번호 평문이 서버로 전송되지 않음**. 측정: 네트워크 로그 캡처 + grep 0건. |
| AC8 | 부고(장례) 이벤트에서 금액 입력 UI는 별도 톤(조의 표기), **어떤 과금/결제 진입점도 노출되지 않음**. 측정: 부고 화면 결제 버튼 0개 검증. |
| AC9 | 게스트(getAnonymousKey)로 로컬 장부 사용 → 토스 로그인 시 **익명 데이터가 userKey로 머지**(중복·유실 0). 서버 신뢰는 authorizationCode→토큰 교환 검증 userKey만. 측정: 게스트→로그인 머지 시나리오 통과. |
| AC10 | 100건 기록 + 50명 사람 데이터에서 목록 스크롤 60fps 체감, 집계 화면 진입 <500ms — **기준 기기(저사양 안드로이드, AC4와 동일 기기 클래스)** 측정. 개발 노트북 금지. 측정: 성능 프로파일. |
| AC11 | **전체 데이터 JSON export → 앱 wipe → import 시 100% 복원**: 사람/이벤트/기록/병합그래프가 원본과 동일. import는 **원본 id 보존**(재생성 금지), personId FK·mergedFrom을 원본 id로 재연결. export 메타(생성시각/userKey/스키마버전) 포함. 스키마버전은 "버전 필드 존재 + 미래 알 수 없는 버전은 명확한 에러로 거부". import는 **wipe-and-restore 전용**(기존 데이터 있으면 경고 후 전체 교체; merge-on-import는 비범위). 측정: 병합된 Person ≥1 포함 DB로 export→clear→import 후 머지그래프 동일 단위/E2E 테스트. |
| AC12 | UI 카피에 "정산/송금" 단어 미사용, "기록/장부/주고받은 내역"만 사용. openURL 송금 딥링크 호출 코드 0건. 측정: 카피 grep + 코드 grep 0건. |
| AC13 | 사용자 주도 **삭제/초기화**: (a) 개별 사람/기록 사용자 삭제 = 집계·net에서 즉시 제외(완전 erasure), (b) "전체 데이터 초기화"로 로컬 DB 전부 삭제. 측정: 삭제 후 집계 반영 + 초기화 후 빈 상태 E2E 테스트. (내부 merge-tombstone(soft)과는 구분 — 아래 4절) |
| AC14 | **E2E 백업 기밀성**: 클라우드 백업 시 단말에서 암호화 후 전송되며, 서버 전송 페이로드(봉투)에 제3자 평문(이름/전화/금액/이벤트명)이 **0건**. 패스프레이즈는 서버로 전송되지 않음. 측정: 봉투 직렬화 grep 0건 단위 테스트(✅ 구현·통과) + 네트워크 캡처. |
| AC15 | **기기변경 복원**: 새 기기에서 로그인(userKey) + 패스프레이즈 입력 시 이전 데이터 **100% 복원**(id·FK·mergedFrom 보존). 틀린 패스프레이즈는 복원 실패(명확한 에러), 분실 시 복구 불가 경고 노출. 측정: 암복호 왕복 단위 테스트(✅ 구현·통과) + 다기기 복원 E2E. |

---

## 3. 단계별 구현 스텝

### 그린필드 디렉토리 트리 (제안)
```
toss-kjs/
├─ package.json
├─ tsconfig.json
├─ granite.config.ts               # ★ 앱인토스 필수 빌드 설정(@apps-in-toss/web-framework). vite.config 단독 아님
├─ index.html
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ routes.tsx
│  │  └─ providers.tsx             # 토스 SDK / 스토어 / 테마 컨텍스트
│  ├─ platform/                    # ★ 플랫폼 어댑터 — 도메인/데이터와 격리(만약의 RN 전환 비용 차단)
│  │  ├─ adapter.ts                # 플랫폼 추상 인터페이스(auth/contacts/storage) — domain은 이것만 의존
│  │  └─ toss/
│  │     ├─ sdk.ts                 # @apps-in-toss/web-framework 래퍼(타입 + 폴백)
│  │     ├─ auth.ts                # appLogin, getAnonymousKey, authorizationCode 핸들링
│  │     ├─ contacts.ts            # fetchContacts(RN전용 가능성) + WebView 미지원 가드
│  │     └─ feature-flags.ts       # Phase0 PoC 결과 기반 토글(연락처 기본 꺼짐 등)
│  ├─ domain/                      # 플랫폼 무관 순수 로직(이식성 핵심)
│  │  ├─ models.ts                 # Person/Event/Record 타입
│  │  ├─ phone.ts                  # E.164 정규화
│  │  ├─ merge.ts                  # soft merge 로직
│  │  ├─ stats.ts                  # 이벤트/사람 통계 계산
│  │  ├─ hint.ts                   # 적정 금액 힌트 규칙
│  │  └─ crypto.ts                 # ★ E2E 백업 암호화(PBKDF2-SHA256 + AES-256-GCM) — R13/AC14/AC15 (구현·테스트 완료)
│  ├─ data/
│  │  ├─ db.ts                     # IndexedDB(Dexie) 스키마 + 스키마버전 필드(마이그레이션 비범위)
│  │  ├─ repositories/
│  │  │  ├─ personRepo.ts
│  │  │  ├─ eventRepo.ts
│  │  │  └─ recordRepo.ts
│  │  ├─ export.ts                 # ★ JSON export (메타: 생성시각/userKey/스키마버전) — AC11
│  │  ├─ import.ts                 # ★ JSON import (원본 id 보존·FK/mergedFrom 재연결·미래버전 거부·wipe-and-restore 전용) — AC11
│  │  └─ cloud-backup.ts           # ★ E2E 클라우드 백업/복원 클라이언트(암호문 봉투 업/다운로드) — R13/AC15
│  ├─ server/                      # ★ 최소 백엔드: userKey별 암호문 blob PUT/GET (authorizationCode→토큰 검증, 평문 PII 미수신)
│  ├─ features/
│  │  ├─ quick-entry/              # 3초 입력 (코어)
│  │  ├─ events/                   # 이벤트 목록/생성/상세 (집계 화면; 카피 "내역/장부")
│  │  ├─ ledger/                   # 평생 장부(사람 중심)
│  │  ├─ person/                   # 사람 상세 + 힌트
│  │  ├─ backup/                   # ★ export/import + E2E 클라우드 백업/복원 화면(패스프레이즈·복구불가 경고) — R13/AC14/AC15
│  │  ├─ settings/                 # ★ 사람/기록 삭제 + 전체 초기화(사용자 erasure, AC13)
│  │  └─ monetization/             # placeholder 카드(커머스/제휴 훅)
│  ├─ ui/                          # 디자인 시스템(버튼/키패드/시트)
│  └─ lib/                         # 유틸(date, format-krw, id)
├─ tests/
│  ├─ unit/                        # phone/merge/stats/hint/export-import
│  └─ e2e/                         # 권한거부·오프라인·export→clear→import 시나리오
└─ .omc/plans/gyeongjosa-ledger-mvp.md
```

### Phase 0 — 샌드박스 PoC 실측 (코딩 전, 차단형 게이트)
> Architect 권고8: 문서 추정 대신 샌드박스 코드로 직접 실측 후 계획 확정. 결과를 `feature-flags.ts`와 본 문서에 기록. 미확인 항목은 보수적 기본값(꺼짐).

- **S0.1 (PoC 선행 3항목 — 차단형)** 빈 미니앱 부트스트랩(`granite.config.ts` + `@apps-in-toss/web-framework`) 후 샌드박스에서 직접 측정. **각 항목은 "결과 → 행동" 결정표로 판정**(표 작성만으로는 통과 아님):

  **① fetchContacts WebView 지원**
  | 측정 결과 | 행동 (go/no-go) |
  |---|---|
  | WebView 지원 + 전체 연락처 반환 | 연락처 편의 기능 ON. **단 R5/AC2를 뒤집지 않음** — 수동 입력이 여전히 코어. RN 재패키징은 불필요(WebView로 충분). |
  | WebView 지원하나 토스 가입자만/제한 반환 | 연락처는 "보조 자동완성"으로만, 기본 ON·기대치 낮춤. RN 재패키징 안 함. |
  | WebView 미지원(RN 전용) | flag OFF(현행 기본값). 연락처는 로드맵 "RN 필요"로 분리. **RN 재패키징 트리거 조건 = 사용자 인터뷰에서 수동입력 이탈률이 치명적일 때만**(MVP에선 안 함). |

  **② IndexedDB 용량·영속성 (구체 수치 임계)**
  | 측정 결과 | 행동 |
  |---|---|
  | quota ≥ 5MB **그리고** 앱 백그라운드/재실행 후 데이터 생존 | IndexedDB 주저장소 채택(현행). 사진 미저장 유지. |
  | quota < 5MB **또는** 재실행 후 데이터 미생존 | IndexedDB를 주저장소에서 **탈락** → 대체안(앱인토스 Storage API/localStorage 등 PoC에서 가용 확인된 것) + **N=10건마다 강제 export 백업** 유도. |
  | **로컬 영속을 전혀 보장 못함**(백그라운드 후 소실 등) | AC6를 **"세션 한정 + 필수 export"로 강등** + ⛔ **"평생 장부" 전제를 Phase 1 착수 전 재평가**(= kill/pivot 결정 지점, 아래 글로벌 게이트 연결). |

  **③ userKey / anonymousKey 안정성**
  | 측정 결과 | 행동 |
  |---|---|
  | anonymousKey가 기기변경/재설치에도 동일 | 게스트 데이터 키 = anonymousKey, 로그인 시 userKey로 머지(AC9 현행). |
  | anonymousKey 미안정(재설치 시 변경) | 백업키 = **userKey(로그인 후)만** 신뢰. **로그인 전 데이터는 export 전용**(자동 복원 불가, UX에 명시). |

- **S0.2 (문서·정책 확인)** 토스 콘솔/문서·커뮤니티로 심사 정책 확인:
  - 카테고리: 금융 아닌 **생활/유틸리티(가계부)**로 신청 가능한지.
  - "기록/장부" 표현 허용, "정산/송금" 회피 가이드 반영.
  - 부고 과금 금지가 심사 정책과 충돌 없는지.
  - 자체 백엔드 SMS/알림톡 발송 심사·PIPA 허용 여부(MVP는 미사용이나 로드맵용 확인).
- 산출물: `platform/toss/sdk.ts`+`auth.ts`+`contacts.ts` 스텁 + `feature-flags.ts` + PoC 실측 메모(결정표 각 행 선택 근거).
- **수용(go 조건)**: 결정표 ①②③ 각각에서 선택된 행동이 확정되고, 글로벌 게이트(아래)에서 ABORT가 아닐 것.

#### ⛔ MVP 글로벌 KILL/ABORT 게이트 (Phase 1 착수 전)
> 플랫폼이 로컬퍼스트 장부를 **근본적으로 지원 못함**이 확인되면 빌드를 중단한다.

| 조건 | 결정 |
|---|---|
| ②가 "로컬 영속 전혀 불가" **그리고** R13 E2E 클라우드 백업조차 불가(미니앱에서 인증된 외부 API 호출/네트워크 제약) | ⛔ **ABORT(미니앱)** → "독립 앱(자체 백엔드 동반) 재검토" 분기. 앱인토스 미니앱으로는 평생 장부 부적합 결론. ※ 결정 A로 자체 백엔드(E2E 클라우드 백업)를 MVP에 포함하므로, 로컬 영속이 세션 한정이어도 데이터는 클라우드에 보존됨 → 로컬은 UX용 캐시로 격하, 데이터 유실 위험은 R13로 해소(매 실행 복원 UX 부담만 남음). |
| ②영속 불가 + ① 연락처 미지원 + S0.2 심사 제약(가계부 카테고리 거절 등)이 **동시** 충족 | ⛔ **ABORT** → 독립앱/타 플랫폼 재검토. |
| 위 ABORT 조건 미충족(영속이 세션 한정이라도 export로 보완 가능) | ✅ **PROCEED** (단 AC6 강등 반영하여 Phase 1 진행) |

### Phase 1 — 도메인 코어 + 로컬 저장 (UI 없이 단위 테스트로 완성)
- **S1.1** `domain/models.ts` 데이터 모델 확정(아래 4절).
- **S1.2** `phone.ts` E.164 정규화 + `merge.ts`: (a) 전화번호 기준 자동 soft merge(AC3), (b) **전화번호 없는 동명 후보 병합 제안 함수**(자동병합 금지, AC3b).
- **S1.3** `data/db.ts` IndexedDB(Dexie) 스키마(**버전 필드 포함**) + repositories CRUD. **연속입력 안전성**: 빠른 다건 저장은 단건당 별도 Dexie 트랜잭션으로 직렬 처리(write 순서 보장), UI는 낙관적 반영 + 실패 시 롤백. 자동완성/검색 입력만 디바운스(저장은 디바운스 금지).
- **S1.4** `stats.ts`(AC4) + `hint.ts`(AC5, 공식: "가장 최근 RECEIVED 단일 금액") 계산 로직.
- **S1.5** `data/export.ts` + `data/import.ts` (AC11): import는 **원본 id 보존**(재생성 금지), personId FK·mergedFrom을 원본 id로 재연결하여 머지그래프 보존. export 메타(생성시각/userKey/스키마버전). 스키마버전 정책 = "버전 필드 존재 + 미래 알 수 없는 버전은 명확한 에러로 거부"(v1→v2 마이그레이션은 비범위). import = **wipe-and-restore 전용**(기존 데이터 있으면 경고 후 전체 교체).
- **S1.6** `domain/crypto.ts` E2E 백업 암호화(PBKDF2-SHA256 210k + AES-256-GCM): `encryptDataset`/`decryptDataset`/봉투 포맷 — R13/AC14/AC15. **✅ 구현·테스트 완료**.
- 산출물: 위 파일 + `tests/unit/*`.
- **수용**: AC3/AC3b/AC4/AC5/AC6/AC11/AC14/AC15 단위 테스트 green. AC11 테스트는 **병합된 Person ≥1 포함 DB의 export→clear→import 후 머지그래프 동일** 케이스 필수 포함. (현재 6개 모듈 31/31 green)

### Phase 2 — 3초 입력 + 핵심 화면 (MVP 본체)
- **S2.1** `ui/` 디자인 시스템 최소셋: NumberPad, BottomSheet, AmountInput, PersonChip.
- **S2.2** `features/quick-entry`: 단일 화면 빠른 입력(방향 토글/금액 키패드/사람 자유입력+병합제안). AC1a 충족(AC1b는 Phase 3 실측).
- **S2.3** `features/events`: 목록·생성·상세(정산 통계, 부고 분기 AC8).
- **S2.4** `features/ledger` + `features/person`: 평생 장부, 사람 상세 + 힌트.
- **S2.5** 인증/연락처 통합: 게스트(getAnonymousKey)→로그인 userKey 머지(AC9), 연락처는 WebView 미지원 가정 폴백(AC2).
- **S2.6** `features/backup`: export/import 화면 + 유실 경고 배너(AC11). **export PII 경고**: export JSON은 제3자 평문 PII(이름·전화·금액)를 기기 밖으로 내보냄 → 명시적 경고 + 선택적 패스프레이즈 암호화 옵션(AC7 정신 보호). 카피 가드(AC12).
- **S2.7** `features/settings`(삭제/거버넌스): 개별 사람·기록 삭제, 전체 데이터 초기화(AC13). 사용자 erasure는 export본 안내 포함.
- **S2.8** `features/monetization`: 답례품/화환 placeholder 카드(클릭 시 "준비 중", 부고엔 미노출).
- **S2.9** **E2E 클라우드 백업(R13/AC14/AC15)**: `data/cloud-backup.ts`(암호문 봉투 업/다운로드) + 최소 백엔드(`server/`: 인증된 userKey별 암호문 blob PUT/GET, authorizationCode→토큰 교환 검증, 평문 PII 미수신). 패스프레이즈 설정 + **복구 불가 경고** UX, 새 기기 복원 플로우.
- 산출물: 위 feature 디렉토리 + `server/`.
- **수용**: AC1a/AC2/AC3b/AC7/AC8/AC9/AC10/AC11/AC12/AC13/AC14/AC15 통과.

### Phase 3 — 검증·측정 (가설 테스트)
- **S3.1** 인앱 경량 이벤트 로깅(로컬 카운터: 입력완료수, 입력소요시간, 이벤트정산 사용여부).
- **S3.2** 5~10명 실사용자(최근 결혼/장례 경험자) 모의 입력 테스트 → AC1b 중앙값 실측 + 핵심 가설 측정(7절) → 파운더 build/pivot/kill 결정.
- **수용**: 7절의 가설 측정 지표 수집 완료.

---

## 4. 정교화된 데이터 모델

### Person
| 필드 | 타입 | 비고 |
|------|------|------|
| id | string(uuid) | PK |
| displayName | string | 표시명(필수) |
| phoneE164 | string? | 정규화된 키. soft merge 기준 |
| phoneRaw | string? | 원본 표기 보존 |
| status | enum `CONTACT_PICKED` \| `MANUAL` \| `TOSS_LINKED` | 출처 |
| mergedFrom | string[] | 병합 흡수된 과거 id 추적 |
| note | string? | |
| createdAt/updatedAt | number | epoch ms |

### Event
| 필드 | 타입 | 비고 |
|------|------|------|
| id | string | PK |
| type | enum `WEDDING` \| `FUNERAL` \| `DOL` \| `HOUSEWARMING` \| `BIRTHDAY` \| `OTHER` | FUNERAL → 부고 UI 분기 |
| title | string | 자동 생성 가능("OO 결혼식") |
| ownerSide | enum `MINE` \| `OTHERS` | 내 경조사(받음) vs 타인 경조사(줌) 기본 방향 결정 |
| date | number | |
| createdAt/updatedAt | number | |

### Record
| 필드 | 타입 | 비고 |
|------|------|------|
| id | string | PK |
| eventId | string? | 이벤트 묶음(평생 장부 단건은 null 허용) |
| personId | string | FK |
| direction | enum `GIVEN` \| `RECEIVED` | |
| amount | number? | KRW, 선물이면 null |
| giftName | string? | 선물명(금액 대신) |
| date | number | |
| source | enum `MANUAL` | **MVP는 MANUAL 단일값**. `TRANSFER_HINT`는 잘라낸 자동송금 기능의 잔재이며 MANUAL과 구분 불가하므로 **MVP 데이터모델에서 제거**(Critic). 향후 송금 연동이 실제 가능해지면 재도입. |
| memo | string? | |
| deletedAt | number? | 사용자 erasure 표식(완전 삭제 처리용; 집계 제외). merge-tombstone과 구분(AC13) |
| createdAt/updatedAt | number | |

### 관계
- Event 1—N Record, Person 1—N Record. Record는 (Person, Event, direction) 묶음의 사실 단위.

### Merge 로직 (`merge.ts`)
1. **전화번호 있음 → 자동 병합(AC3)**: phoneE164 동일 키 Person 존재 시 신규 생성 대신 그 Person에 Record 연결. 표시명이 다르면 Person.displayName 유지 + 후보를 note에 보존.
2. **전화번호 없음 → 병합 제안(AC3b, 자동 금지)**: 신규 Person 저장 시 displayName이 기존 Person과 일치하면 "같은 사람인가요?" 제안. 사용자가 확인하면 합치고(mergedFrom 기록), 거부하면 별도 Person 유지(동명이인). 핵심 net 수치 오염 방지.
3. 전화번호 없던 Person에 후에 번호 추가 시 동일 키 발견하면 흡수(mergedFrom 기록).

### 두 종류의 "삭제" 구분 (AC13)
- **merge-tombstone (soft, 내부)**: 병합으로 흡수된 Person id는 hard delete하지 않고 mergedFrom에 보존 → 병합 되돌리기·import 그래프 복원 가능. 사용자에게 안 보임.
- **사용자 erasure (완전 삭제)**: 사용자가 명시적으로 삭제한 사람/기록은 집계·net·평생장부에서 완전 제외(`deletedAt` 또는 실제 레코드 제거). 전체 초기화는 로컬 DB 전부 제거. "hard delete 금지"는 내부 merge에만 적용되며 **사용자 삭제권과 충돌하지 않는다**.

### 로컬 저장 방식 (영속 비보장 — 안전망 필수)
- **IndexedDB(Dexie)** 메인 스토어(스키마 버전 포함). 모든 제3자 금액·연락처는 로컬 only.
- ⚠️ **영속성 비보장**: 토스 FAQ — "앱 삭제 시 Storage 데이터도 삭제", "기기변경 후 유지하려면 자체 서버 연동". WebView IndexedDB도 보수적으로 비보장 간주. 사진 미저장(용량 한도 미확인)·텍스트 중심.
- **안전망(MVP 필수, 2단)**: (1) `data/export.ts`/`import.ts` 수동 JSON 백업/복원(AC11), (2) **E2E 암호화 클라우드 백업**(R13) — `domain/crypto.ts`로 단말에서 암호화 후 **암호문만** 서버 저장, 새 기기에서 패스프레이즈로 복원(AC15). 이로써 기기변경·앱삭제에도 데이터 보존.
- 서버 전송 데이터는 익명 카운터/검증된 userKey + **암호문 봉투(평문 PII 0건, AC14)**뿐. 패스프레이즈는 서버로 전송하지 않음 → 운영자도 복호화 불가(E2E). 분실 시 복구 불가(UX 경고 필수).

### 백업 인가 모델 (Architect 권고6)
- 백업 스코프 키 = **userKey**. 단, 클라이언트가 전달하는 userKey를 직접 신뢰하지 않고 **서버측 authorizationCode→토큰 교환으로 검증된 userKey만 신뢰**.
- 로그인 전 익명 데이터는 **getAnonymousKey**(기기변경/재설치에도 동일 키 반환 확인됨)로 보관 → 로그인 시 익명 데이터를 userKey로 머지(AC9).

---

## 5. 핵심 화면 흐름 + "3초 입력" UX

### 화면 8개 (+백업/설정)
> 카피 가드(AC12): "정산/송금" 금지 → "내역/장부/주고받은 기록" 사용.

1. **홈/대시보드**: 최근 이벤트 카드, 큰 FAB "기록 추가". 평생 순(net) 요약. 백업 미실행 시 경고 배너.
2. **빠른 입력(Quick Entry)**: 핵심. 방향 토글(받음/줌) → 숫자 키패드 즉시 포커스(만원 단위 칩 5/10/30/50) → 사람(자유입력 1순위, 연락처는 WebView 미지원 시 자동 숨김). 저장 1탭.
3. **이벤트 목록 / 생성**: 타입 선택 → 자동 제목 → 진입.
4. **이벤트 상세(내역 집계)**: 합계/건수/평균/Top3, 참석자 라인업. 부고면 "조의" 톤·과금 0(AC8). 카피 "정산" 미사용.
5. **평생 장부(사람 중심)**: 사람 리스트(받은/준 net 배지), 검색.
6. **사람 상세**: 받은/준 타임라인 + 적정 금액 힌트 카드.
7. **백업/복원(설정 내)**: JSON export(파일 저장/공유) + import + 유실 경고·정기 백업 안내·PII 평문 경고/암호화 옵션(AC11).
8. **설정/데이터 관리**: 사람 삭제 · 기록 삭제 · 전체 데이터 초기화(사용자 erasure, 완전 삭제, AC13). 내부 merge-tombstone(soft)과 구분.

### "3초 입력" 설계 (AC1a 탭수 / AC1b 실사용자 속도)
- 빠른 입력은 **단일 화면 시트**, 페이지 전환 없음.
- 진입 즉시 숫자 키패드 포커스 + 만원 단위 빠른 칩.
- **방향 기본값 precedence(충돌 해소)**: ① 이벤트 컨텍스트 안에서 입력하면 `Event.ownerSide` 우선(MINE=RECEIVED, OTHERS=GIVEN). ② 이벤트 밖(홈/빠른입력)에서 입력하면 "마지막 사용 방향". 즉 **이벤트 컨텍스트 > 마지막 사용**. 사용자는 언제든 토글로 덮어쓰기 가능.
- 사람은 **타이핑이 1순위**(연락처는 보조). 최근 사용 3명 칩 노출.
- 저장 후 토스트 + 키패드 유지로 연속 입력(다건 폭주 대응). 저장은 단건 트랜잭션 직렬 처리(디바운스 없음).
- 탭 경로 예: [방향 추론됨] → 금액 칩 1탭 → 사람 칩/타이핑 → 저장 = 최소 3탭(AC1a ≤4).
- **접근성(백로그 노트)**: 고령 사용자·부고 맥락 고려 — 스크린리더 라벨, 동적 폰트 스케일 대응, 터치 타깃 ≥ 44px. MVP 필수는 아니나 설계 시 위배 금지.

---

## 6. 리스크 + 완화책

| 리스크 | 영향 | 완화책 |
|--------|------|--------|
| **fetchContacts가 WebView 미지원/RN 전용 가능성** | 연락처 편의 상실 | WebView **미지원으로 기본 가정**(기본 꺼짐). 연락처 의존 기능은 "RN 필요" 플래그로 로드맵 분리. 코어 100% 수동입력 유지(AC2). Phase0 PoC ①에서 실측. |
| **로컬 저장 영속 비보장**(앱삭제/기기변경 시 유실 — 토스 FAQ 명시) | 평생 장부 신뢰성 치명 | **E2E 암호화 클라우드 백업(R13, MVP)** 으로 기기변경·앱삭제에도 복원 + 운영자 복호화 불가(AC14/AC15). + 수동 export/import(AC11) 보조 + 유실 경고 배너. Phase0 PoC ②에서 로컬 한도·영속성 실측(로컬은 UX용 캐시, 진실원본은 클라우드 백업). |
| WebView IndexedDB 용량 한도 미확인 | 대량 데이터 저장 실패 | 사진 미저장·텍스트 중심 정책. PoC ②에서 한도 실측 후 상한 가드. |
| **저빈도 리텐션**(경조사는 드묾) | 재방문↓ | (a) 평생 장부의 "조회 가치"로 식 없을 때도 열게(다른 사람 경조사 갈 때 힌트), (b) 결혼철(봄·가을) 집중. 리텐션 대신 "내역 입력 완료율(=사용성 지표)"을 1차로. |
| 송금 자동화 기대 불일치 + 딥링크 불허 | CS·심사 거절 | "자동" 단어 금지. 송금 딥링크(openURL) Out of Scope·코드 0건(AC12). source=MANUAL 단일(자동송금 잔재 제거). |
| 부고 과금 윤리/심사 거절 | 출시 차단 | AC8로 결제 진입점 0개 강제 + 코드 가드. |
| 토스 심사 카테고리 제한(금전성) | 출시 지연 | **금융 아닌 생활/유틸리티(가계부)로 신청**. 심사 제출문에 "실제 돈 이동 없음, 수동 기록 전용, 외부 송금 딥링크 미사용" 명시. 카피 "기록/장부"(AC12). Phase0 S0.2 선검증. |
| 데이터 모델 오설계로 병합 꼬임 | 데이터 오염 | soft merge(merge-tombstone) + mergedFrom 추적으로 복구 가능. AC3/AC3b 테스트. |
| **전화번호 없는 동명이인 미병합** → net 수치 오염 | 평생 장부 핵심 가치 훼손 | 동명 시 병합 제안(AC3b, 자동 금지). 가장 흔한 입력 경로(이름 타이핑) 직접 대응. |
| **연속 다건 저장 시 write 경합/유실** | 정산 최적화 핵심 시나리오 깨짐 | 단건 트랜잭션 직렬 처리 + 낙관적 UI + 실패 롤백(S1.3). 저장 디바운스 금지. |
| **export JSON이 제3자 평문 PII 유출** | AC7 정신 위배·PIPA 리스크 | export 시 명시적 경고 + 선택적 패스프레이즈 암호화 옵션(S2.6). |

---

## 7. 검증 단계 (핵심 사업가설 측정)

### 핵심 가설
"받는 쪽, **결혼식 직후 정산**이 실제로 돈 낼 만한 페인인가?"

### 측정 설계
- **정성**: 최근 6개월 내 결혼/장례 정산 경험자 5~10명 인터뷰 + 모의 정산(우리 앱으로 30건 입력) 관찰.
- **정량 지표(방향 신호 — 통계적 유효 아님)**: n=5~10은 ≥40% 류 비율 임계에 **통계적으로 무의미**. 아래 수치는 합/불이 아니라 **정성적 방향 신호**로만 해석.
  - 입력 완료율: 모의 30건 끝까지 입력한 사용자 비율(목표 신호 ≥70%).
  - 입력 속도: AC1b 중앙값 **≤ 3초/건**(이것은 결정적 측정).
  - 지불의사(WTP): "이 기능에 월 X원/답례품 구매 의향" 긍정(신호 ≥40%, 통계 유효 아님).
  - 평생 장부 가치: "다음 경조사 금액 결정에 힌트가 유용"(신호 ≥60%).
  - ⚠️ 1차 KPI "입력 완료율"은 **사용성(usability)을 검증**하는 것이지 사업성(돈 낼 페인인가)을 증명하지 않음. 사업성은 WTP·재방문·실결제로만 검증됨.
- **의사결정**: **S3.2 직후 파운더(의사결정자)가 build / pivot / kill 결정**. 신호가 약하면 → 주는 쪽 평생 장부로 무게중심 이동(pivot) 또는 중단(kill). 정량 비율은 결정의 근거가 아니라 인터뷰 정성 통찰의 보조.

### 수익화 훅 검증(보조)
- `features/monetization` placeholder 클릭률 측정 → 답례품/화환 송객 관심 신호 확보(실연동 전 수요 검증).

---

## ARCHITECT 자문 결과 (해소됨)

> 본 5개 질문은 Architect 자문으로 답변 확보. PoC로 최종 실측 확정할 항목은 Phase 0로 이관.

1. **빌드 타깃** → ✅ 순수 Vite 아님. React + `@apps-in-toss/web-framework` + `granite.config.ts`(필수) → `npm run build` 번들 → 콘솔 업로드. (반영: 헤더·디렉토리 트리)
2. **fetchContacts** → ⚠️ 권한표상 RN SDK 전용 표기 → **WebView 미지원 가능성**. 기본 꺼짐 가정, RN 플래그로 분리. PoC ①에서 실측. (반영: R5, 리스크, Phase0)
3. **로컬 저장 영속성** → ⚠️ **비보장**(토스 FAQ: 앱삭제 시 삭제, 기기변경 시 자체서버 필요). export/import를 MVP 필수로 승격(AC11). PoC ②에서 한도 실측. (반영: 4절, AC11)
4. **심사 가이드** → ✅ 금융 아닌 **생활/유틸리티(가계부)** 신청. "정산/송금" 금지·"기록/장부" 사용. openURL 송금 딥링크 불허. 제출문에 "실제 돈 이동 없음·수동 기록 전용·딥링크 미사용" 명시. (반영: AC12, Out of Scope, 리스크, Phase0)
5. **userKey 식별** → ✅ getAnonymousKey는 기기변경/재설치에도 동일 키 반환 확인. 단 서버는 authorizationCode→토큰 교환 검증 userKey만 신뢰. PoC ③에서 재확인. (반영: R10, 백업 인가 모델, AC9)

### 남은 PoC 확정 항목 (Phase 0 차단형, `.omc/plans/open-questions.md`에도 기록)
- [ ] fetchContacts WebView 실제 지원/반환스키마/거부에러 — 연락처 기능 활성 여부 최종 결정
- [ ] WebView IndexedDB 용량 한도 수치 + 캐시클리어/앱삭제 영속성 — 저장 상한·백업 강제 주기 결정
- [ ] 동일 계정 재로그인/재설치 시 userKey·anonymousKey 동일성 — 백업 복원 키 신뢰성 확정

---

## 개정 이력 (Critic 1차 REJECT 반영)
- **C1** Phase 0에 ①②③ go/no-go 결정표 + ⛔ MVP 글로벌 KILL/ABORT 게이트 신설(파괴적 결과 시 빌드 중단/독립앱 분기). AC6 강등 조건 명문화.
- **C2** AC11 왕복 무결성 설계: 원본 id 보존·FK/mergedFrom 재연결, 병합 Person 포함 라운드트립 테스트, 스키마버전 "거부" 정책, wipe-and-restore 전용.
- **C3** AC3b 신설: 전화번호 없는 동명이인 병합 제안(자동 금지) → net 오염 방지.
- **Major**: AC1a/AC1b 분리(탭수 결정적 vs 실사용자 중앙값), AC4/AC10 기준 기기 고정(저사양 안드로이드), AC13 삭제/거버넌스 신설(erasure vs merge-tombstone 분리), 피벗룰 정직화(n=5~10 통계 무의미·파운더 결정·완료율=사용성).
- **Missing**: 연속입력 트랜잭션 직렬·디바운스 정책, export PII 경고/암호화, hint.ts 공식 고정, direction precedence(이벤트>마지막사용), 접근성 백로그 노트, TRANSFER_HINT 제거(source=MANUAL 단일).
