# 마음장부 E2E 클라우드 백업 — 참조 서버

key(=userKey 또는 deviceKey)별로 **암호문 봉투 하나**를 보관하는 최소 서버다.
**서버는 절대 복호화하지 않는다** — 패스프레이즈는 단말을 떠나지 않으므로 운영자도 평문을 볼 수 없다(E2E).

> ⚠️ 이건 **참조 구현**이다(의존성 없음, Node 내장 모듈만). 실제 운영(HTTPS, 인증, 영속 스토리지, 요율 제한, 백업)은 배포자의 몫이다. 루트 앱 빌드와 분리돼 있다(`poc/`처럼).

## 실행

```bash
node server/index.mjs
# → http://localhost:8787
```

환경변수:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `PORT` | `8787` | 포트 |
| `DATA_DIR` | `./server/.data` | 암호문 파일 저장 위치 |
| `AUTH_TOKEN` | (없음) | 설정 시 `Authorization: Bearer <token>` 필수 |
| `CORS_ORIGIN` | `*` | 허용 Origin (운영에선 토스 WebView Origin으로 제한 권장) |

## API (와이어 규약 — `src/data/cloud-backup.ts` / `src/data/auth.ts`와 일치)

```
PUT  /backup/:key    body = BackupEnvelope(JSON)            → 204
GET  /backup/:key                                           → 200 BackupEnvelope | 404
POST /auth/login     body = {authorizationCode, referrer}   → 200 {userKey} | 501(미설정)
OPTIONS *                                                   → 204 (CORS preflight)
```

### 토스 로그인 교환 (`POST /auth/login`) — userKey 발급

클라이언트 `appLogin()`이 준 `authorizationCode`를 토스 파트너 API로 교환해 안정적인 `userKey`를 돌려준다.
`userKey`는 기기변경에도 동일한 **백업 복원 키**로 쓰인다.

- 토스 파트너 API 인증은 **mTLS(클라이언트 인증서)** — API Key/시크릿 헤더가 아니다.
  콘솔 > **mTLS 인증서**에서 `client-cert.pem` / `client-key.pem`을 발급받아 경로를 환경변수로 지정한다.
- **인증서를 설정하지 않으면 이 라우트는 `501`을 반환**한다(스캐폴드 안전 비활성). 백업 기능은 그래도 동작한다.

| 변수 | 설명 |
|---|---|
| `TOSS_CLIENT_CERT` | client-cert.pem 경로 (mTLS) |
| `TOSS_CLIENT_KEY` | client-key.pem 경로 (mTLS) |
| `TOSS_API_BASE` | 기본 `apps-in-toss-api.toss.im` (운영/샌드박스 공통, `referrer`로 구분) |

호출 흐름(서버 내부): `POST .../oauth2/generate-token {authorizationCode, referrer}` → `accessToken` →
`GET .../oauth2/login-me` (Bearer) → `{userKey}`.

> ⚠️ 이 토큰교환 경로는 **스캐폴드**다 — mTLS 인증서 + 실제 토스 환경 없이는 검증되지 않았다.
> 클라이언트 어댑터(`src/data/auth.ts`)와 우리 서버 사이 규약은 단위 테스트로 검증됨(`tests/unit/auth.test.ts`).

- `:key`는 클라이언트가 `encodeURIComponent`로 인코딩. 서버는 이를 **sha256 해시 파일명**으로 매핑해 path traversal과 문자셋 문제를 차단한다.
- `BackupEnvelope` = `{ v:1, kdf, iterations, salt, iv, ciphertext }` (모두 base64/스칼라). 서버는 이 "모양"만 가볍게 검증하고 저장한다.
- 바디 상한 8MB(`MAX_BODY`).

## 클라이언트 연결

앱의 **백업/복원** 화면에서 서버 주소를 입력하면 `localStorage`에 저장되고,
`backupToCloud()` / `restoreFromCloud()`(`src/data/cloud-backup.ts`)가 위 API를 호출한다.

```
key   = 로그인 시 userKey, 아니면 deviceKey(getAnonymousKey hash)
```

## 보안 메모

- 서버 저장물은 **AES-256-GCM 암호문**뿐이다. 이름·전화·금액 등 제3자 평문은 존재하지 않는다(테스트로 검증: `tests/unit/cloud-backup.test.ts`).
- 패스프레이즈 분실 = **복구 불가**(E2E의 본질). 앱 UI에서 명확히 경고한다.
- `key` 안정성(기기변경/재설치 시 동일성)은 토스가 공식 보장하지 않음 → Phase 0 실측 대상(`src/poc/decision.ts`). 로그인 후 `userKey`가 가장 안정적인 복원 키.
- ⚠️ **운영 시 per-user 인가 필수**: 이 참조 서버의 `/backup/:key`는 클라이언트가 보낸 key를 그대로 신뢰한다(단일 공유 `AUTH_TOKEN`만 선택). 운영 서버는 **인증 세션에서 userKey를 도출**해 caller와 key를 묶어야 한다 — 그래야 타인의 userKey로 암호문을 덮어쓰거나(`PUT`) 가져가는(`GET`) 것을 막는다. 내용은 E2E 암호화돼 읽히지 않지만, 위치 특정·삭제/덮어쓰기는 인가로 차단해야 한다.
