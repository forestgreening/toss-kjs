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
  - **테스트 52개 통과**(도메인/저장소). `npm run dev`로 실행(localhost:5173~), `npm test`로 검증.
- ⏳ **다음**: 토스 번들 래핑(출품) + Phase 0 샌드박스 실측. 아래 §7.
- ⚠️ **마감**: 앱인토스 바이브코딩 챌린지 6/30 첫 번들 등록(출품 목표).

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

## 7. 다음 단계 (앱은 이미 완성 — 남은 건 출품/연동)

1. **토스 번들 래핑(출품, 최우선)** — 현재 표준 React라 브라우저에선 동작. 출품하려면 `@apps-in-toss/web-framework`로 감싸 번들 → 콘솔 등록. `src/main.tsx`를 앱인토스 진입점으로, 루트 `granite.config.ts` 추가, `appLogin`/연락처 SDK 실연결. (사용자의 토스 콘솔/계정 작업 필요)
2. **Phase 0 샌드박스 실측(병렬)** — `poc/` 측정 하니스를 토스에 올려 §6 3가지 실측 → `src/poc/decision.ts`로 go/no-go.
3. **여유분**: E2E 클라우드 백업 연동(domain/crypto.ts는 구현 완료, server/UI 미연동), 광고(IAA — 초기 진입 수익으로 재평가됨, 부고 제외).

### 앱 구조
- `src/domain/` 순수 로직(models·phone·merge·stats·hint·backup·crypto), `src/data/` Dexie 저장소·서비스(ledgerService·personOps·erase·backupStore·seed), `src/features/` 화면, `src/ui/` styles·format·TopBar, `src/app/` App·store.
- `poc/` 토스 측정 하니스(별도, 루트 빌드 외).
- UI/UX 리뷰 미반영 잔여(출품 비필수): confirm/alert→인앱모달 전면화, 성능 메모이제이션, 일부 행 시맨틱 button화.

## 8. 기술 스택 (예정)

- 앱인토스 WebView: React + `@apps-in-toss/web-framework` + `granite.config.ts`(필수) → `npm run build` 번들 → **콘솔 업로드** (순수 Vite 아님)
- 로컬 저장: IndexedDB(Dexie). 데이터 모델: `Person` / `Event` / `Record` (상세는 계획서 §4)
- E2E 백업: `domain/crypto.ts`(PBKDF2-SHA256 + AES-256-GCM, **구현·테스트 완료**) + `data/cloud-backup.ts` + 최소 `server/`(userKey별 암호문 blob). 패스프레이즈는 서버 미전송, 분실 시 복구 불가.
- 비즈니스 로직(domain/data)을 플랫폼 어댑터와 분리 — 만일의 RN 전환 비용 격리.

## 9. Git 신원 주의

이 저장소는 **`forestgreening <forestgreening@gmail.com>`** 신원으로 커밋한다(로컬 `git config`로 설정됨). 전역 설정과 다를 수 있으니 커밋 전 `git config user.email` 확인.
