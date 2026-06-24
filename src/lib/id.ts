// 고유 id 생성. WebCrypto의 randomUUID 사용(앱인토스 WebView/브라우저 모두 지원).
export function newId(): string {
  return crypto.randomUUID();
}
