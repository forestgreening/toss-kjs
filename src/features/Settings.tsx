import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { wipeAll } from '../data/erase';

export function Settings({ nav, back, home }: { nav: Nav; back: () => void; home: () => void }) {
  const { reload, records, persons, events } = useLedger();
  const [msg, setMsg] = useState('');

  async function onWipe() {
    if (!confirm('모든 데이터를 삭제합니다. 되돌릴 수 없어요. 계속할까요?')) return;
    await wipeAll();
    await reload();
    setMsg('전체 초기화 완료.');
  }

  return (
    <>
      <TopBar title="설정" onBack={back} onHome={home} />
      <div className="content">
        <div className="card">
          <div className="muted">저장된 데이터</div>
          <div>경조사 {events.length} · 사람 {persons.length} · 기록 {records.length}</div>
        </div>

        <div className="card list-item" onClick={() => nav({ name: 'backup' })}>
          <b>백업 / 복원</b>
          <span className="muted">›</span>
        </div>

        <div className="card">
          <b style={{ color: 'var(--red)' }}>전체 데이터 초기화</b>
          <p className="muted" style={{ margin: '6px 0 10px' }}>로컬의 모든 경조사·사람·기록을 삭제합니다.</p>
          <button className="ghost" style={{ color: 'var(--red)', borderColor: '#f7c5c9' }} onClick={onWipe}>전체 삭제</button>
        </div>

        {msg && <div className="card" style={{ color: 'var(--blue)' }}>{msg}</div>}
        <div className="muted" style={{ textAlign: 'center' }}>실제 송금은 없어요 · 직접 기록하는 장부예요</div>
      </div>
    </>
  );
}
