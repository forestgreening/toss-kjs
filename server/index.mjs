// 마음장부 E2E 클라우드 백업 — 최소 참조 서버 (의존성 없음, Node 내장 모듈만).
//  - key(=userKey/deviceKey)별로 "암호문 봉투" 하나를 파일로 보관할 뿐, 절대 복호화하지 않는다.
//  - 패스프레이즈는 서버로 오지 않으므로 운영자도 평문을 볼 수 없다(E2E).
//  - 이건 참조 구현이다. 실제 운영 호스팅(HTTPS·인증·백업·요율제한)은 배포자(사용자)의 몫.
//
// 와이어 규약 (src/data/cloud-backup.ts와 일치):
//   PUT  /backup/:key   body=BackupEnvelope(JSON)   → 204
//   GET  /backup/:key                                → 200 BackupEnvelope | 404
//
// 실행:  node server/index.mjs
// 환경변수:
//   PORT         (기본 8787)
//   DATA_DIR     (기본 ./server/.data)  — 암호문 파일 저장 위치
//   AUTH_TOKEN   (선택) 설정 시 Authorization: Bearer <token> 필수
//   CORS_ORIGIN  (기본 *) 허용 Origin
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const PORT = Number(process.env.PORT ?? 8787);
const DATA_DIR = resolve(process.env.DATA_DIR ?? join(process.cwd(), 'server', '.data'));
const AUTH_TOKEN = process.env.AUTH_TOKEN ?? '';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MAX_BODY = 8 * 1024 * 1024; // 8MB 상한

// key를 sha256 파일명으로 매핑 → path traversal/문자셋 문제 원천 차단.
function keyToPath(key) {
  const hash = createHash('sha256').update(key).digest('hex');
  return join(DATA_DIR, `${hash}.json`);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization');
}

function send(res, status, body, type = 'application/json') {
  cors(res);
  res.statusCode = status;
  if (body == null) {
    res.setHeader('content-length', '0');
    res.end();
    return;
  }
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.setHeader('content-type', type);
  res.end(payload);
}

function authed(req) {
  if (!AUTH_TOKEN) return true;
  return req.headers['authorization'] === `Bearer ${AUTH_TOKEN}`;
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// 서버는 복호화하지 않는다. 다만 "암호문 봉투 모양"인지만 가볍게 검증(쓰레기 저장 방지).
function looksLikeEnvelope(obj) {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.v === 1 &&
    typeof obj.ciphertext === 'string' && obj.ciphertext.length > 0 &&
    typeof obj.salt === 'string' && obj.salt.length > 0 &&
    typeof obj.iv === 'string' && obj.iv.length > 0
  );
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null);

    const url = new URL(req.url, `http://${req.headers.host}`);
    const match = url.pathname.match(/^\/backup\/([^/]+)$/);
    if (!match) return send(res, 404, { error: 'not found' });
    if (!authed(req)) return send(res, 401, { error: 'unauthorized' });

    const key = decodeURIComponent(match[1]);
    const file = keyToPath(key);

    if (req.method === 'GET') {
      if (!existsSync(file)) return send(res, 404, { error: 'no backup' });
      const blob = await readFile(file, 'utf8');
      return send(res, 200, blob);
    }

    if (req.method === 'PUT') {
      let body;
      try {
        body = await readBody(req);
      } catch {
        return send(res, 413, { error: 'payload too large' });
      }
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return send(res, 400, { error: 'invalid json' });
      }
      if (!looksLikeEnvelope(parsed)) return send(res, 422, { error: 'not an encrypted envelope' });
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(parsed));
      return send(res, 204, null);
    }

    return send(res, 405, { error: 'method not allowed' });
  } catch (e) {
    console.error('[backup-server]', e);
    return send(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`[마음장부 백업 서버] http://localhost:${PORT}  data=${DATA_DIR}  auth=${AUTH_TOKEN ? 'on' : 'off'}`);
});
