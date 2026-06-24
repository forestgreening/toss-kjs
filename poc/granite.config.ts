// 앱인토스 WebView 빌드 설정 (스텁).
// ⚠️ 설치된 @apps-in-toss/web-framework 버전이 생성/요구하는 스키마에 맞춰 조정하세요.
//    (SDK 설치 시 자동 생성되는 granite.config.ts 가 정답 — 이 파일은 출발점일 뿐)
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'gyeongjosa-poc',
  // 측정에 필요한 권한 — 연락처 읽기
  permissions: [{ name: 'contacts', access: 'read' }],
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
});
