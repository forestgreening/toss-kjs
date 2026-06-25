// 앱인토스 WebView 빌드 설정 — Phase 0 측정 하니스용.
//  - 설치된 @apps-in-toss/web-framework 2.9.3 타입(AppsInTossWebConfig)에 맞춘 실제 스키마.
//  - brand / permissions / webViewProps.type 는 필수. appName/icon은 콘솔 값으로 교체.
//  - getAnonymousKey는 비게임(type 'partner') 미니앱에서만 동작 → type 'partner' 유지.
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // TODO(콘솔): 측정용 임시 앱을 콘솔에 만들고 그 앱 ID로 교체.
  appName: 'gyeongjosa-poc',
  brand: {
    displayName: '경조사 PoC',
    primaryColor: '#3182F6',
    icon: '', // TODO(콘솔): 임시 로고 URL
  },
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
  webViewProps: { type: 'partner' },
  outdir: 'dist',
});
