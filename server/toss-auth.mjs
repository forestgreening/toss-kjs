// 토스 파트너 로그인 토큰교환 (서버 측) — appLogin authorizationCode → userKey.
//  - 토스 파트너 API 인증은 mTLS(클라이언트 인증서). API Key/시크릿 헤더가 아니다.
//    콘솔 > mTLS 인증서에서 client-cert.pem / client-key.pem 발급 후 경로를 환경변수로 지정.
//  - 인증서 미설정 시 tossConfigured()=false → 라우트가 501을 반환(스캐폴드 안전 비활성).
//
// 스펙(앱인토스 개발자센터, 2026-06 기준):
//   POST {base}/api-partner/v1/apps-in-toss/user/oauth2/generate-token
//        body { authorizationCode, referrer } → { accessToken, refreshToken, tokenType, expiresIn, scope }
//   GET  {base}/api-partner/v1/apps-in-toss/user/oauth2/login-me
//        header Authorization: Bearer {accessToken} → { userKey:number, ... }
//   base = https://apps-in-toss-api.toss.im (운영/샌드박스 공통, referrer로 구분)
import { request } from 'node:https';
import { readFileSync } from 'node:fs';

const API_BASE = process.env.TOSS_API_BASE ?? 'apps-in-toss-api.toss.im';
const CERT_PATH = process.env.TOSS_CLIENT_CERT ?? '';
const KEY_PATH = process.env.TOSS_CLIENT_KEY ?? '';

const GENERATE_TOKEN = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';
const LOGIN_ME = '/api-partner/v1/apps-in-toss/user/oauth2/login-me';

let creds = null;
function mtls() {
  if (creds) return creds;
  if (!CERT_PATH || !KEY_PATH) return null;
  try {
    creds = { cert: readFileSync(CERT_PATH), key: readFileSync(KEY_PATH) };
  } catch (e) {
    // "Toss 거부"와 "인증서 경로 오류"를 구분 가능하게(운영 로그용).
    throw new Error(`mTLS 인증서/키를 읽을 수 없어요 (${CERT_PATH} / ${KEY_PATH}): ${e.message}`);
  }
  return creds;
}

export function tossConfigured() {
  return Boolean(CERT_PATH && KEY_PATH);
}

function host() {
  return API_BASE.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function tossRequest({ method, path, headers = {}, body }) {
  const c = mtls();
  if (!c) return Promise.reject(new Error('mTLS cert/key not configured'));
  const payload = body ? JSON.stringify(body) : undefined;
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: host(),
        port: 443,
        path,
        method,
        cert: c.cert,
        key: c.key,
        headers: {
          'content-type': 'application/json',
          ...(payload ? { 'content-length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json;
          try {
            json = data ? JSON.parse(data) : {};
          } catch {
            json = { raw: data };
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(15_000, () => req.destroy(new Error('toss request timeout')));
    if (payload) req.write(payload);
    req.end();
  });
}

/** authorizationCode(+referrer) → userKey. 실패 시 throw. */
export async function loginToUserKey({ authorizationCode, referrer }) {
  const gen = await tossRequest({
    method: 'POST',
    path: GENERATE_TOKEN,
    body: { authorizationCode, referrer },
  });
  if (gen.status < 200 || gen.status >= 300 || typeof gen.json?.accessToken !== 'string') {
    const nonJson = gen.json?.raw != null ? ', non-JSON body' : '';
    throw new Error(`generate-token failed (HTTP ${gen.status}${nonJson})`);
  }
  const me = await tossRequest({
    method: 'GET',
    path: LOGIN_ME,
    headers: { authorization: `Bearer ${gen.json.accessToken}` },
  });
  if (me.status < 200 || me.status >= 300 || me.json?.userKey == null) {
    const nonJson = me.json?.raw != null ? ', non-JSON body' : '';
    throw new Error(`login-me failed (HTTP ${me.status}${nonJson})`);
  }
  return { userKey: me.json.userKey };
}
