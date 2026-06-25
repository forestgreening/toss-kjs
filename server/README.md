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

## API (와이어 규약 — `src/data/cloud-backup.ts`와 일치)

```
PUT  /backup/:key    body = BackupEnvelope(JSON)   → 204
GET  /backup/:key                                  → 200 BackupEnvelope | 404
OPTIONS /backup/:key                               → 204 (CORS preflight)
```

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
