import { useState } from 'react';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { personLedger } from '../domain/stats';
import { suggestAmount } from '../domain/hint';
import { deletePerson, deleteRecord } from '../data/erase';
import { editPerson, mergePeople } from '../data/personOps';
import { formatKRW, formatDate } from '../ui/format';

export function PersonDetail({ back, id }: { back: () => void; id: string }) {
  const { persons, records, reload, events } = useLedger();
  const person = persons.find((p) => p.id === id);
  const [mode, setMode] = useState<'view' | 'edit' | 'merge'>('view');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [mergeQuery, setMergeQuery] = useState('');

  if (!person) return <div className="center">사람을 찾을 수 없어요</div>;

  const l = personLedger(records, id);
  const hint = suggestAmount(records, id);
  const recs = records.filter((r) => r.personId === id && !r.deletedAt).sort((a, b) => b.date - a.date);
  const others = persons.filter((p) => p.id !== id);
  // 합치기 후보: 검색어가 있으면 이름 검색, 없으면 "이름이 같은 사람"만 제안(번호/개명으로 갈린 동일인)
  const q = mergeQuery.trim().toLowerCase();
  const nameKey = person.displayName.trim().toLowerCase();
  const mergeCandidates = q
    ? others.filter((p) => p.displayName.toLowerCase().includes(q))
    : others.filter((p) => p.displayName.trim().toLowerCase() === nameKey);

  function startEdit() {
    setEditName(person!.displayName);
    setEditPhone(person!.phoneRaw ?? '');
    setMode('edit');
  }
  async function saveEdit() {
    await editPerson(id, { displayName: editName, phoneRaw: editPhone || null }, Date.now());
    await reload();
    setMode('view');
  }
  async function doMerge(otherId: string, otherName: string) {
    if (!confirm(`'${otherName}'님을 '${person!.displayName}'님과 합칠까요?\n'${otherName}'의 기록이 모두 옮겨지고 '${otherName}'은 사라져요.\n(부부로 묶었다면 합친 뒤 이름을 '○○·○○'로 바꿀 수 있어요)`)) return;
    await mergePeople(id, otherId, Date.now());
    await reload();
    setMode('view');
  }

  return (
    <>
      <TopBar title={person.displayName} onBack={back} />
      <div className="content">
        {mode === 'edit' && (
          <div className="card">
            <label className="lbl" style={{ marginTop: 0 }}>이름 (개명했으면 수정하세요)</label>
            <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="lbl">전화번호 (바뀌었으면 수정하세요)</label>
            <input className="field" inputMode="tel" placeholder="010-0000-0000" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="ghost" style={{ flex: 1 }} onClick={() => setMode('view')}>취소</button>
              <button className="primary" style={{ flex: 1 }} onClick={saveEdit}>저장</button>
            </div>
          </div>
        )}

        {mode === 'merge' && (
          <div className="card">
            <b>다른 사람과 합치기</b>
            <div className="muted" style={{ margin: '4px 0 10px' }}>
              '{person.displayName}'님의 내역을 고른 사람과 합쳐 한 사람으로 정리해요.
              개명·번호 변경으로 갈렸거나, 두 분이 부부가 되어 한 집으로 묶을 때 써요.
            </div>
            <input
              className="field"
              placeholder="합칠 사람 이름 검색"
              value={mergeQuery}
              onChange={(e) => setMergeQuery(e.target.value)}
            />
            <div style={{ marginTop: 8 }}>
              {mergeCandidates.length === 0 ? (
                <div className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>
                  {q ? '검색 결과가 없어요' : '이름이 같은 사람이 없어요 · 위에서 검색해 고를 수 있어요'}
                </div>
              ) : (
                mergeCandidates.map((p) => {
                  const ol = personLedger(records, p.id);
                  return (
                    <div key={p.id} className="list-item" onClick={() => doMerge(p.id, p.displayName)}>
                      <div>
                        <b>{p.displayName}</b>
                        <div className="muted">받은 마음 {formatKRW(ol.receivedSum)} · 보낸 마음 {formatKRW(ol.givenSum)}</div>
                      </div>
                      <span className="muted">합치기 ›</span>
                    </div>
                  );
                })
              )}
            </div>
            <button className="ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => setMode('view')}>취소</button>
          </div>
        )}

        {mode === 'view' && (
          <>
            <div className="card">
              <div className="muted">주고받은 마음</div>
              <div className={'big ' + (l.net >= 0 ? 'net-pos' : 'net-neg')}>{formatKRW(l.net)}</div>
              <div className="row" style={{ marginTop: 8 }}>
                <span className="muted">받은 마음 {formatKRW(l.receivedSum)}</span>
                <span className="muted">보낸 마음 {formatKRW(l.givenSum)}</span>
              </div>
            </div>

            {hint != null && (
              <div className="card" style={{ background: 'var(--blue-weak)' }}>
                <b style={{ color: 'var(--blue)' }}>다음에 전할 마음</b>
                <div style={{ marginTop: 4 }}>이분이 최근 전해주신 마음은 <b>{formatKRW(hint)}</b>이에요.</div>
              </div>
            )}

            <div className="card">
              <b>주고받은 내역</b>
              {recs.map((r) => {
                const occ = r.occasion ?? events.find((e) => e.id === r.eventId)?.title ?? null;
                return (
                  <div key={r.id} className="list-item">
                    <div>
                      <span className="tag" style={r.direction === 'RECEIVED' ? {} : { background: '#eef0f2', color: '#5b636b' }}>
                        {r.direction === 'RECEIVED' ? '받음' : '보냄'}
                      </span>
                      <span className="muted" style={{ marginLeft: 8 }}>{formatDate(r.date)}</span>
                      {occ ? <span className="muted" style={{ marginLeft: 8 }}>· {occ}</span> : null}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <b>{r.amount != null ? formatKRW(r.amount) : (r.giftName ?? '선물')}</b>
                      <button
                        className="back"
                        style={{ color: 'var(--gray)', fontSize: 16 }}
                        aria-label="기록 삭제"
                        onClick={async () => {
                          if (confirm('이 기록을 지울까요?')) {
                            await deleteRecord(r.id);
                            await reload();
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="ghost" style={{ width: '100%' }} onClick={startEdit}>이름·번호 수정</button>
            <button className="ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setMergeQuery(''); setMode('merge'); }}>다른 사람과 합치기</button>
            <button
              className="ghost"
              style={{ width: '100%', color: 'var(--red)', borderColor: '#f7c5c9', marginTop: 8 }}
              onClick={async () => {
                if (confirm(`${person.displayName} 님과 모든 기록을 지울까요?`)) {
                  await deletePerson(id);
                  await reload();
                  back();
                }
              }}
            >
              이 사람 삭제
            </button>
          </>
        )}
      </div>
    </>
  );
}
