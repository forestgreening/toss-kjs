import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { eventStats } from '../domain/stats';
import { deleteRecord } from '../data/erase';
import { MonetizationCard } from './MonetizationCard';
import { formatKRW, formatValue, EVENT_LABEL } from '../ui/format';

export function EventDetail({ nav, back, home, id }: { nav: Nav; back: () => void; home: () => void; id: string }) {
  const { events, records, personMap, reload } = useLedger();
  const ev = events.find((e) => e.id === id);
  if (!ev) {
    return (
      <>
        <TopBar title="경조사" onBack={back} onHome={home} />
        <div className="center">경조사를 찾을 수 없어요</div>
      </>
    );
  }

  const isFuneral = ev.type === 'FUNERAL';
  const isMine = ev.ownerSide === 'MINE';
  const direction = isMine ? 'RECEIVED' : 'GIVEN';
  const recs = records.filter((r) => r.eventId === id && !r.deletedAt);
  const stats = eventStats(recs, personMap, { direction });
  const totalLabel = isMine ? (isFuneral ? '받은 조의' : '받은 마음') : '내가 전한 마음';

  return (
    <div className={isFuneral ? 'funeral' : ''}>
      <TopBar title={ev.title} onBack={back} onHome={home} />
      <div className="content" style={{ paddingBottom: 90 }}>
        {!isMine && (
          <div className="card" style={{ background: '#fff8e1', border: '1px solid #ffe1b3' }}>
            <b>다른 사람의 경조사예요</b>
            <div className="muted" style={{ marginTop: 4 }}>
              보통 한 번만 내니, 이런 건 홈의 <b>기록 추가</b>로 바로 적는 게 편해요.
              (경조사 정산함은 <b>내 경조사</b>용이에요)
            </div>
          </div>
        )}

        <div className="card">
          <span className="tag">{EVENT_LABEL[ev.type]}</span>
          <div className="muted" style={{ margin: '12px 0 2px' }}>{totalLabel} 합계</div>
          <div className="big">{formatKRW(stats.total)}</div>
          {isMine && (
            <div className="row" style={{ marginTop: 10 }}>
              <span className="muted">{stats.count}건</span>
              <span className="muted">평균 {formatKRW(stats.average)}</span>
            </div>
          )}
        </div>

        {isMine && stats.top.length > 0 && (
          <div className="card">
            <b>마음 많이 전해주신 분</b>
            {stats.top.map((t, i) => (
              <div key={t.personId} className="list-item">
                <span>{i + 1}. {t.name}</span>
                <b>{formatKRW(t.sum)}</b>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <b>{isMine ? `받은 내역 (${recs.length})` : '기록'}</b>
          {recs.length === 0 ? (
            <div className="center">
              {isMine ? '아래 + 기록 추가로 받은 분들을 입력하세요' : '기록이 없어요'}
            </div>
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
                    <b>{formatValue(r.amount, r.giftName)}</b>
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

        {isMine && !isFuneral && <MonetizationCard />}
      </div>

      {isMine && <button className="primary fab" onClick={() => nav({ name: 'quick', eventId: id })}>+ 기록 추가</button>}
    </div>
  );
}
