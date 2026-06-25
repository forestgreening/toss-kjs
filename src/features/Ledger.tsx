import { useMemo, useState, type CSSProperties } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { rowButton } from '../ui/rowProps';
import { personLedger } from '../domain/stats';
import { formatKRW } from '../ui/format';
import { AdBanner } from '../ui/AdBanner';

export function Ledger({ nav, back, home }: { nav: Nav; back: () => void; home: () => void }) {
  const { persons, records } = useLedger();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'owe' | 'owed'>('all');

  const rows = useMemo(
    () =>
      persons
        .map((p) => ({ p, l: personLedger(records, p.id) }))
        .sort((a, b) => Math.abs(b.l.net) - Math.abs(a.l.net)),
    [persons, records],
  );

  const oweCount = useMemo(() => rows.filter((r) => r.l.net > 0).length, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ p, l }) => {
      if (filter === 'owe' && l.net <= 0) return false;
      if (filter === 'owed' && l.net >= 0) return false;
      if (q) {
        const hay = `${p.displayName} ${p.note ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, filter]);

  const plain = filter === 'all' && query.trim() === ''; // 필터/검색 없는 기본 상태

  // 사람이 사라진 고아 기록(예: 손상된 백업 복원)도 합계가 어긋나지 않게 묶어 보여줌
  const personIds = new Set(persons.map((p) => p.id));
  const orphanIds = [...new Set(records.filter((r) => !personIds.has(r.personId)).map((r) => r.personId))];
  const orphan = orphanIds.length
    ? orphanIds.reduce(
        (acc, oid) => {
          const l = personLedger(records, oid);
          return { receivedSum: acc.receivedSum + l.receivedSum, givenSum: acc.givenSum + l.givenSum, net: acc.net + l.net };
        },
        { receivedSum: 0, givenSum: 0, net: 0 },
      )
    : null;

  return (
    <>
      <TopBar title="사람별 장부" onBack={back} onHome={home} />
      <div className="content">
        <div className="muted" style={{ margin: '0 4px 4px' }}>
          그동안 주고받은 사람들이에요. 다음에 얼마나 전하면 좋을지 가늠이 돼요.
        </div>
        <div className="muted" style={{ margin: '0 4px 12px', fontSize: 12 }}>
          +는 내가 더 받았어요 · −는 내가 더 보냈어요
        </div>

        {(rows.length > 0 || orphan) && (
          <>
            <input
              className="field"
              placeholder="이름·메모 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ marginBottom: 8 }}
            />
            <div className="chips" style={{ marginBottom: 12 }}>
              <button className="chip" style={filter === 'all' ? sel : undefined} onClick={() => setFilter('all')}>전체</button>
              <button className="chip" style={filter === 'owe' ? sel : undefined} onClick={() => setFilter('owe')}>
                갚을 차례{oweCount > 0 ? ` ${oweCount}` : ''}
              </button>
              <button className="chip" style={filter === 'owed' ? sel : undefined} onClick={() => setFilter('owed')}>내가 더 보냄</button>
            </div>
          </>
        )}

        {rows.length === 0 && !orphan ? (
          <div className="center" style={{ padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>👥</div>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>아직 사람 기록이 없어요</div>
            <div className="muted">기록을 추가하면 사람별로 모여요</div>
          </div>
        ) : visible.length === 0 && !(plain && orphan) ? (
          <div className="center" style={{ padding: '28px 0' }}>
            <div className="muted">조건에 맞는 사람이 없어요</div>
          </div>
        ) : (
          <div className="card">
            {visible.map(({ p, l }) => (
              <div key={p.id} className="list-item" {...rowButton(() => nav({ name: 'person', id: p.id }))}>
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
            {plain && orphan && (
              <div className="list-item">
                <div>
                  <b>알 수 없음</b>
                  <div className="muted">이전/복원 기록 · 받은 마음 {formatKRW(orphan.receivedSum)} · 보낸 마음 {formatKRW(orphan.givenSum)}</div>
                </div>
                <span className={orphan.net >= 0 ? 'net-pos' : 'net-neg'}>
                  {orphan.net >= 0 ? '+' : ''}{formatKRW(orphan.net)}
                </span>
              </div>
            )}
          </div>
        )}

        <AdBanner />
      </div>
    </>
  );
}

const sel: CSSProperties = { borderColor: 'var(--blue)', color: 'var(--blue)' };
