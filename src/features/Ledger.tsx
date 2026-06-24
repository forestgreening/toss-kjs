import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { personLedger } from '../domain/stats';
import { formatKRW } from '../ui/format';

export function Ledger({ nav, back }: { nav: Nav; back: () => void }) {
  const { persons, records } = useLedger();
  const rows = persons
    .map((p) => ({ p, l: personLedger(records, p.id) }))
    .sort((a, b) => Math.abs(b.l.net) - Math.abs(a.l.net));

  return (
    <>
      <TopBar title="평생 장부" onBack={back} />
      <div className="content">
        {rows.length === 0 ? (
          <div className="center">아직 사람 기록이 없어요</div>
        ) : (
          <div className="card">
            {rows.map(({ p, l }) => (
              <div key={p.id} className="list-item" onClick={() => nav({ name: 'person', id: p.id })}>
                <div>
                  <b>{p.displayName}</b>
                  <div className="muted">받음 {formatKRW(l.receivedSum)} · 줌 {formatKRW(l.givenSum)}</div>
                </div>
                <span className={l.net >= 0 ? 'net-pos' : 'net-neg'}>
                  {l.net >= 0 ? '+' : ''}{formatKRW(l.net)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="muted" style={{ textAlign: 'center' }}>
          +는 내가 더 받음(갚을 차례) · −는 내가 더 줌
        </div>
      </div>
    </>
  );
}
