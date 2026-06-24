import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { formatKRW, EVENT_LABEL, formatDate } from '../ui/format';
import type { Direction, LedgerRecord } from '../domain/models';

function sum(records: LedgerRecord[], dir: Direction): number {
  return records
    .filter((r) => r.direction === dir && !r.deletedAt && typeof r.amount === 'number')
    .reduce((s, r) => s + (r.amount as number), 0);
}

export function Home({ nav }: { nav: Nav }) {
  const { events, records } = useLedger();
  const recv = sum(records, 'RECEIVED');
  const give = sum(records, 'GIVEN');
  const net = recv - give;
  const recent = events.slice(0, 3);

  return (
    <>
      <TopBar title="경조사 장부" />
      <div className="content" style={{ paddingBottom: 90 }}>
        <div className="card">
          <div className="muted">평생 주고받은 순액</div>
          <div className={'big ' + (net >= 0 ? 'net-pos' : 'net-neg')}>{formatKRW(net)}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted">받음 {formatKRW(recv)}</span>
            <span className="muted">줌 {formatKRW(give)}</span>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', gap: 8 }}>
          <button className="ghost" style={{ flex: 1 }} onClick={() => nav({ name: 'events' })}>경조사</button>
          <button className="ghost" style={{ flex: 1 }} onClick={() => nav({ name: 'ledger' })}>평생 장부</button>
          <button className="ghost" style={{ flex: 1 }} onClick={() => nav({ name: 'settings' })}>설정</button>
        </div>

        <div className="card">
          <div className="row">
            <b>최근 경조사</b>
            <span className="tag" style={{ cursor: 'pointer' }} onClick={() => nav({ name: 'events' })}>전체</span>
          </div>
          {recent.length === 0 ? (
            <div className="center">아직 기록이 없어요</div>
          ) : (
            recent.map((e) => (
              <div key={e.id} className="list-item" onClick={() => nav({ name: 'event', id: e.id })}>
                <div>
                  <b>{e.title}</b>
                  <div className="muted">{EVENT_LABEL[e.type]} · {formatDate(e.date)}</div>
                </div>
                <span className="muted">›</span>
              </div>
            ))
          )}
        </div>
      </div>

      <button className="primary fab" onClick={() => nav({ name: 'quick' })}>+ 기록 추가</button>
    </>
  );
}
