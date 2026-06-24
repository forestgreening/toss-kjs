// PoC 진입점: 4개 프로브를 실행해 화면에 결과 + 복사용 JSON을 렌더한다.
// 출력된 JSON(Phase0Results)을 evaluatePhase0(src/poc/decision.ts)에 넣으면 go/no-go 판정이 나온다.

import { probeContacts, probePersistence, probeBackend, probeIdentity, type ProbeOutput } from './probes';
import { listFns } from './sdk';

function section<T>(title: string, p: ProbeOutput<T>): string {
  return `
    <section style="margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:8px">
      <h3 style="margin:0 0 6px">${title}</h3>
      <div><b>정규화 결과</b>: <code>${escape(JSON.stringify(p.result))}</code></div>
      <details style="margin-top:6px"><summary>raw</summary><pre>${escape(JSON.stringify(p.raw, null, 2))}</pre></details>
      ${p.humanCheck ? `<p style="color:#b35900;margin:6px 0 0">🔎 ${escape(p.humanCheck)}</p>` : ''}
    </section>`;
}

function escape(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
}

async function run(): Promise<void> {
  const app = document.getElementById('app')!;
  app.innerHTML = '<h1>앱인토스 Phase 0 측정</h1><p>측정 중…</p>';

  const [contacts, persistence, backend, identity] = await Promise.all([
    probeContacts(),
    probePersistence(),
    probeBackend(),
    probeIdentity(),
  ]);

  const results = {
    contacts: contacts.result,
    persistence: persistence.result,
    backend: backend.result,
    identity: identity.result,
  };

  app.innerHTML = `
    <h1 style="font-size:20px">앱인토스 Phase 0 측정</h1>
    <p style="color:#666">아래 JSON을 복사해 evaluatePhase0()에 넣거나 그대로 공유하세요.
       연락처 scope·식별자 안정성은 🔎 안내대로 직접 판단해 수정하세요.</p>
    ${section('① 연락처 (fetchContacts)', contacts)}
    ${section('② 로컬 영속성 (IndexedDB)', persistence)}
    ${section('자체 백엔드 호출 (E2E 백업 전제)', backend)}
    ${section('③ 식별자 (getAnonymousKey / appLogin)', identity)}
    <section style="margin:12px 0;padding:12px;border:1px solid #ddd;border-radius:8px">
      <h3 style="margin:0 0 6px">SDK가 노출한 함수</h3>
      <pre>${escape(JSON.stringify(listFns(), null, 2))}</pre>
    </section>
    <h3>📋 Phase0Results (복사)</h3>
    <textarea id="out" style="width:100%;height:160px">${escape(JSON.stringify(results, null, 2))}</textarea>
  `;
}

run().catch((e) => {
  document.getElementById('app')!.innerHTML =
    `<h1>측정 실패</h1><pre>${escape(String(e?.stack ?? e))}</pre>` +
    `<p>SDK 로딩/권한 문제일 수 있습니다. README의 트러블슈팅을 보세요.</p>`;
});
