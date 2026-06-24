import { useState } from 'react';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { exportDataset, replaceAll } from '../data/backupStore';
import { exportData, importData } from '../domain/backup';

export function Backup({ back, home }: { back: () => void; home: () => void }) {
  const { reload, records } = useLedger();
  const [msg, setMsg] = useState('');

  async function onExport() {
    const file = exportData(await exportDataset(), Date.now());
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gyeongjosa-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg('백업 파일을 저장했어요.');
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text());
      const dataset = importData(parsed);
      if (records.length > 0 && !confirm('현재 데이터를 모두 지우고 백업으로 덮어씁니다. 계속할까요?')) return;
      await replaceAll(dataset);
      await reload();
      setMsg('복원 완료.');
    } catch (err) {
      setMsg('복원 실패: ' + String(err));
    }
  }

  return (
    <>
      <TopBar title="백업 / 복원" onBack={back} onHome={home} />
      <div className="content">
        <div className="card">
          <b>내보내기 (JSON)</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            ⚠️ 백업 파일에는 이름·연락처·주고받은 내역이 담겨요. 안전한 곳에 보관하세요.
          </p>
          <button className="primary" onClick={onExport}>백업 파일 저장</button>
        </div>

        <div className="card">
          <b>가져오기 (덮어쓰기)</b>
          <p className="muted" style={{ margin: '6px 0 12px' }}>
            백업 파일을 선택하면 현재 데이터를 전부 교체합니다(wipe-and-restore).
          </p>
          <input type="file" accept="application/json" onChange={onImport} />
        </div>

        {msg && <div className="card" style={{ color: 'var(--blue)' }}>{msg}</div>}

        <div className="muted" style={{ textAlign: 'center' }}>
          기기를 바꾸면 로컬 데이터가 사라질 수 있어요. 정기적으로 백업하세요.
          <br />(추후 암호화 클라우드 백업이 추가됩니다)
        </div>
      </div>
    </>
  );
}
