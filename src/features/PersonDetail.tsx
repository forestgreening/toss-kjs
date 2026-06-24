import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { personLedger } from '../domain/stats';
import { suggestAmount } from '../domain/hint';
import { deletePerson, deleteRecord } from '../data/erase';
import { formatKRW, formatDate } from '../ui/format';

export function PersonDetail({ back, id }: { back: () => void; id: string }) {
  const { persons, records, reload } = useLedger();
  const person = persons.find((p) => p.id === id);
  if (!person) return <div className="center">사람을 찾을 수 없어요</div>;

  const l = personLedger(records, id);
  const hint = suggestAmount(records, id);
  const recs = records.filter((r) => r.personId === id && !r.deletedAt).sort((a, b) => b.date - a.date);

  return (
    <>
      <TopBar title={person.displayName} onBack={back} />
      <div className="content">
        <div className="card">
          <div className="muted">순액 (받음 − 줌)</div>
          <div className={'big ' + (l.net >= 0 ? 'net-pos' : 'net-neg')}>{formatKRW(l.net)}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted">받음 {formatKRW(l.receivedSum)}</span>
            <span className="muted">줌 {formatKRW(l.givenSum)}</span>
          </div>
        </div>

        {hint != null && (
          <div className="card" style={{ background: 'var(--blue-weak)' }}>
            <b style={{ color: 'var(--blue)' }}>적정 금액 힌트</b>
            <div style={{ marginTop: 4 }}>이분이 최근 주신 금액은 <b>{formatKRW(hint)}</b>이에요.</div>
          </div>
        )}

        <div className="card">
          <b>주고받은 내역</b>
          {recs.map((r) => (
            <div key={r.id} className="list-item">
              <div>
                <span className="tag" style={r.direction === 'RECEIVED' ? {} : { background: '#eef0f2', color: '#5b636b' }}>
                  {r.direction === 'RECEIVED' ? '받음' : '줌'}
                </span>
                <span className="muted" style={{ marginLeft: 8 }}>{formatDate(r.date)}</span>
              </div>
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
          ))}
        </div>

        <button
          className="ghost"
          style={{ width: '100%', color: 'var(--red)', borderColor: '#f7c5c9' }}
          onClick={async () => {
            if (confirm(`${person.displayName} 님과 모든 기록을 삭제할까요?`)) {
              await deletePerson(id);
              await reload();
              back();
            }
          }}
        >
          이 사람 삭제
        </button>
      </div>
    </>
  );
}
