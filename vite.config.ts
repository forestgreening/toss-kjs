import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 표준 React 빌드. 앱인토스 번들은 granite/@apps-in-toss/web-framework로 감싸 빌드한다
// (이 저장소에서는 SDK 미설치 — 브라우저 모드로 UI/로직을 개발/검증하고,
//  토스 연동/번들은 콘솔 가이드에 맞춰 별도 래핑).
export default defineConfig({
  plugins: [react()],
});
