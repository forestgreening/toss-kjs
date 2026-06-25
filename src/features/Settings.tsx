import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { useDialog } from '../ui/Dialog';
import { rowButton } from '../ui/rowProps';
import { wipeAll } from '../data/erase';

export function Settings({ nav, back, home }: { nav: Nav; back: () => void; home: () => void }) {
  const { reload, records, persons, events } = useLedger();
  const { confirm } = useDialog();
  const [msg, setMsg] = useState('');

  async function onWipe() {
    const ok = await confirm({
      title: '전체 데이터 초기화',
      message: '모든 데이터를 삭제합니다. 되돌릴 수 없어요. 계속할까요?',
      confirmText: '전체 삭제',
      danger: true,
    });
    if (!ok) return;
    await wipeAll();
    await reload();
    setMsg('전체 초기화 완료.');
  }

  return (
    <>
      <TopBar title="설정" onBack={back} onHome={home} />
      <div className="content">
        <div className="card">
          <div className="muted" style={{ marginBottom: 8 }}>저장된 데이터</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {([['경조사', events.length], ['사람', persons.length], ['기록', records.length]] as const).map(
              ([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>{val}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{label}</div>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="card list-item" {...rowButton(() => nav({ name: 'backup' }))}>
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
