import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { formatKRW, formatDate } from '../ui/format';
import type { Direction, LedgerRecord } from '../domain/models';

function sum(records: LedgerRecord[], dir: Direction): number {
  return records
    .filter((r) => r.direction === dir && !r.deletedAt && typeof r.amount === 'number')
    .reduce((s, r) => s + (r.amount as number), 0);
}

export function Home({ nav }: { nav: Nav }) {
  const { events, records, personMap } = useLedger();
  const recv = sum(records, 'RECEIVED');
  const give = sum(records, 'GIVEN');
  const net = recv - give;
  const recent = records
    .filter((r) => !r.deletedAt)
    .slice()
    .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <>
      <TopBar
        title="마음장부"
        right={
          <button className="back" style={{ fontSize: 20 }} aria-label="설정" onClick={() => nav({ name: 'settings' })}>
            ⚙
          </button>
        }
      />
      <div className="content" style={{ paddingBottom: 90 }}>
        <div className="muted" style={{ margin: '-2px 4px 12px' }}>경조사 주고받기 · 마음을 기록해요</div>
        <div className="card">
          <div className="muted">그동안 주고받은 금액</div>
          <div className={'big ' + (net >= 0 ? 'net-pos' : 'net-neg')}>{formatKRW(net)}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted">받은 마음 {formatKRW(recv)}</span>
            <span className="muted">보낸 마음 {formatKRW(give)}</span>
          </div>
        </div>

        <div className="card list-item" onClick={() => nav({ name: 'events' })}>
          <div>
            <b>📥 내 경조사</b>
            <div className="muted">내가 받은 축의·조의를 정산해요</div>
          </div>
          <span className="muted">›</span>
        </div>
        <div className="card list-item" onClick={() => nav({ name: 'ledger' })}>
          <div>
            <b>👥 사람별 장부</b>
            <div className="muted">누구와 얼마 주고받았는지 한눈에</div>
          </div>
          <span className="muted">›</span>
        </div>

        <div className="card">
          <div className="row">
            <b>최근 기록</b>
            <span className="tag" style={{ cursor: 'pointer' }} onClick={() => nav({ name: 'ledger' })}>전체</span>
          </div>
          {recent.length === 0 ? (
            <div className="center">아직 기록이 없어요 · 아래 + 기록 추가로 시작하세요</div>
          ) : (
            recent.map((r) => {
              const occ = r.occasion ?? events.find((e) => e.id === r.eventId)?.title ?? null;
              return (
                <div key={r.id} className="list-item" onClick={() => nav({ name: 'person', id: r.personId })}>
                  <div>
                    <b>{personMap.get(r.personId)?.displayName ?? '(이름 없음)'}</b>
                    <div className="muted">
                      <span className="tag" style={r.direction === 'RECEIVED' ? {} : { background: '#eef0f2', color: '#5b636b' }}>
                        {r.direction === 'RECEIVED' ? '받음' : '보냄'}
                      </span>
                      {occ ? ` · ${occ}` : ''} · {formatDate(r.date)}
                    </div>
                  </div>
                  <b>{r.amount != null ? formatKRW(r.amount) : (r.giftName ?? '선물')}</b>
                </div>
              );
            })
          )}
        </div>
      </div>

      <button className="primary fab" onClick={() => nav({ name: 'quick' })}>+ 기록 추가</button>
    </>
  );
}
