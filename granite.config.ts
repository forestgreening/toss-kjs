// 앱인토스(Apps in Toss) WebView 번들 빌드 설정.
//  - `ait build` 가 이 파일을 읽어 `vite build` 결과물을 `.ait` 출품 아티팩트로 감싼다.
//  - 브라우저 개발/검증은 기존대로 `npm run dev` / `npm run build`(순수 Vite) 사용.
//
// ⚠️ 콘솔 의존 값(아래 TODO)은 앱인토스 콘솔에서 앱을 만든 뒤 실제 값으로 교체해야 출품/심사가 통과된다.
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // TODO(콘솔): 앱인토스 콘솔에서 발급/등록한 앱 ID로 교체. (`ait deploy` 대상 식별자)
  appName: 'maeumjangbu',

  // 비게임 미니앱 — getAnonymousKey 사용 가능 조건(=type 'partner' / appType 'general').
  appType: 'general',

  brand: {
    // 콘솔에 등록한 노출명과 동일해야 한다.
    displayName: '마음장부',
    // 앱 hero/포인트 컬러(styles.css --blue).
    primaryColor: '#3182F6',
    // TODO(콘솔): 콘솔에 업로드한 앱 로고 이미지 URL로 교체.
    icon: '',
  },

  // 심사용 권한 선언 — 연락처 읽기(편의 기능). 권한 없어도 앱은 100% 동작(수동 입력).
  permissions: [{ name: 'contacts', access: 'read' }],

  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },

  // 'partner' = 일반 파트너 미니앱 프레임(비게임).
  webViewProps: { type: 'partner' },

  outdir: 'dist',
});
