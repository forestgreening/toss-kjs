import { describe, it, expect } from 'vitest';
import { exchangeAuthCode, AuthError, type FetchLike } from '../../src/data/auth';
import type { AppLoginResult } from '../../src/platform/identity';

const login: AppLoginResult = { authorizationCode: 'code-123', referrer: 'DEFAULT' };

function fakeFetch(status: number, body: unknown): FetchLike {
  return async () =>
    new Response(body == null ? null : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
}

describe('토스 로그인 교환 (auth.ts)', () => {
  it('성공 시 userKey(number)를 문자열로 반환', async () => {
    const userKey = await exchangeAuthCode('https://s.example.com', login, fakeFetch(200, { userKey: 443731104 }));
    expect(userKey).toBe('443731104');
  });

  it('서버가 보낸 body를 그대로 전달(authorizationCode/referrer)', async () => {
    let sent: unknown;
    const fetchImpl: FetchLike = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ userKey: 1 }), { status: 200 });
    };
    await exchangeAuthCode('https://s.example.com', login, fetchImpl);
    expect(sent).toEqual({ authorizationCode: 'code-123', referrer: 'DEFAULT' });
  });

  it('501(미설정)은 명확한 AuthError', async () => {
    await expect(exchangeAuthCode('https://s.example.com', login, fakeFetch(501, { error: 'x' }))).rejects.toBeInstanceOf(AuthError);
  });

  it('비정상 응답(502)은 AuthError', async () => {
    await expect(exchangeAuthCode('https://s.example.com', login, fakeFetch(502, { error: 'x' }))).rejects.toBeInstanceOf(AuthError);
  });

  it('userKey 누락은 AuthError', async () => {
    await expect(exchangeAuthCode('https://s.example.com', login, fakeFetch(200, { scope: 'x' }))).rejects.toBeInstanceOf(AuthError);
  });

  it('baseUrl 미설정은 AuthError', async () => {
    await expect(exchangeAuthCode('', login, fakeFetch(200, { userKey: 1 }))).rejects.toBeInstanceOf(AuthError);
  });
});
