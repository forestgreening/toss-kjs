import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { eventStats } from '../domain/stats';
import { deleteRecord } from '../data/erase';
import { MonetizationCard } from './MonetizationCard';
import { formatKRW, EVENT_LABEL } from '../ui/format';

export function EventDetail({ nav, back, id }: { nav: Nav; back: () => void; id: string }) {
  const { events, records, personMap, reload } = useLedger();
  const ev = events.find((e) => e.id === id);
  if (!ev) return <div className="center">경조사를 찾을 수 없어요</div>;

  const isFuneral = ev.type === 'FUNERAL';
  const direction = ev.ownerSide === 'MINE' ? 'RECEIVED' : 'GIVEN';
  const recs = records.filter((r) => r.eventId === id && !r.deletedAt);
  const stats = eventStats(recs, personMap, { direction });
  const dirLabel = direction === 'RECEIVED' ? (isFuneral ? '받은 조의' : '받은 금액') : '낸 금액';

  return (
    <div className={isFuneral ? 'funeral' : ''}>
      <TopBar title={ev.title} onBack={back} />
      <div className="content" style={{ paddingBottom: 90 }}>
        <div className="card">
          <span className="tag">{EVENT_LABEL[ev.type]}</span>
          <div className="muted" style={{ margin: '12px 0 2px' }}>{dirLabel} 합계</div>
          <div className="big">{formatKRW(stats.total)}</div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="muted">{stats.count}건</span>
            <span className="muted">평균 {formatKRW(stats.average)}</span>
          </div>
        </div>

        {stats.top.length > 0 && (
          <div className="card">
            <b>가장 많이 {direction === 'RECEIVED' ? '주신 분' : '낸 곳'}</b>
            {stats.top.map((t, i) => (
              <div key={t.personId} className="list-item">
                <span>{i + 1}. {t.name}</span>
                <b>{formatKRW(t.sum)}</b>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <b>기록 ({recs.length})</b>
          {recs.length === 0 ? (
            <div className="center">기록 추가를 눌러 시작하세요</div>
          ) : (
            recs
              .slice()
              .sort((a, b) => b.date - a.date)
              .map((r) => (
                <div key={r.id} className="list-item">
                  <span style={{ flex: 1, cursor: 'pointer' }} onClick={() => nav({ name: 'person', id: r.personId })}>
                    {personMap.get(r.personId)?.displayName ?? '(이름 없음)'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <b>{r.amount != null ? formatKRW(r.amount) : (r.giftName ?? '선물')}</b>
                    <button
                      className="back"
                      style={{ color: 'var(--gray)', fontSize: 16 }}
                      aria-label="기록 삭제"
                      onClick={async () => {
                        if (confirm('이 기록을 삭제할까요?')) {
                          await deleteRecord(r.id);
                          await reload();
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>

        {!isFuneral && <MonetizationCard />}
      </div>

      <button className="primary fab" onClick={() => nav({ name: 'quick', eventId: id })}>+ 기록 추가</button>
    </div>
  );
}
