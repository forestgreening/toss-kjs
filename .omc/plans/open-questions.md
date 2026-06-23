# Open Questions

## 경조사 주고받기 장부 MVP - 2026-06-23 (Architect 자문 후)

Phase 0 PoC 차단형 — 코딩 전 샌드박스 실측으로 확정 필요:

- [ ] fetchContacts WebView 실제 지원 여부 + 반환 스키마(name/phone/photo) + 권한 거부 에러 형태 — 연락처 편의 기능 활성/비활성(RN 플래그 분리) 최종 결정에 직결
- [ ] WebView IndexedDB 용량 한도 수치 + 캐시클리어/앱삭제 시 영속성 — 저장 상한·사진 저장 정책·백업 강제 주기 결정에 직결
- [ ] 동일 계정 재로그인/재설치 시 userKey 및 getAnonymousKey 동일성 — 백업 복원 키 신뢰성·익명→로그인 머지 설계에 직결

파운더(의사결정자) 결정 필요 (Critic 반영):

- [ ] **Phase 0 글로벌 게이트**: PoC ②영속 불가 + ③anonymousKey 미안정(또는 +①연락처 미지원 +심사 제약)이면 ABORT(미니앱) → 독립앱(자체 백엔드) 재검토할지 — Phase 1 착수 전 파운더 결정
- [ ] **build/pivot/kill**: S3.2 실사용자 측정 직후 파운더가 결정. 신호 약하면 주는 쪽 평생 장부로 pivot vs kill (n=5~10은 통계 무의미, 정성 통찰 중심)
- [ ] export/import 백업 파일 전달 방식 — OS 파일 저장 vs 토스 공유 시트 vs 향후 서버 동기화 우선순위
- [ ] export PII 암호화: 패스프레이즈 암호화를 MVP 기본 ON으로 할지 옵션으로 둘지
- [ ] AC4/AC10 기준 기기 클래스 확정 — 어떤 저사양 안드로이드 모델을 성능 기준선으로 삼을지
