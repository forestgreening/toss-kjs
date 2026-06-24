import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { personLedger } from '../domain/stats';
import { formatKRW } from '../ui/format';

export function Ledger({ nav, back, home }: { nav: Nav; back: () => void; home: () => void }) {
  const { persons, records } = useLedger();
  const rows = persons
    .map((p) => ({ p, l: personLedger(records, p.id) }))
    .sort((a, b) => Math.abs(b.l.net) - Math.abs(a.l.net));

  return (
    <>
      <TopBar title="사람별 장부" onBack={back} onHome={home} />
      <div className="content">
        <div className="muted" style={{ margin: '0 4px 12px' }}>
          그동안 주고받은 사람들이에요. 다음에 얼마나 전하면 좋을지 가늠이 돼요.
        </div>
        {rows.length === 0 ? (
          <div className="center">아직 사람 기록이 없어요</div>
        ) : (
          <div className="card">
            {rows.map(({ p, l }) => (
              <div key={p.id} className="list-item" onClick={() => nav({ name: 'person', id: p.id })}>
                <div>
                  <b>{p.displayName}</b>
                  <div className="muted">받은 마음 {formatKRW(l.receivedSum)} · 보낸 마음 {formatKRW(l.givenSum)}</div>
                  {p.note && <div className="muted">📝 {p.note}</div>}
                </div>
                <span className={l.net >= 0 ? 'net-pos' : 'net-neg'}>
                  {l.net >= 0 ? '+' : ''}{formatKRW(l.net)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="muted" style={{ textAlign: 'center' }}>
          +는 내가 더 받았어요 · −는 내가 더 보냈어요
        </div>
      </div>
    </>
  );
}
