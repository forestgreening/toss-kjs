import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { eventRepo } from '../data/repositories/eventRepo';
import { newId } from '../lib/id';
import { EVENT_LABEL, formatDate } from '../ui/format';
import type { EventType, OwnerSide, EventRec } from '../domain/models';

const TYPES: EventType[] = ['WEDDING', 'FUNERAL', 'DOL', 'HOUSEWARMING', 'BIRTHDAY', 'OTHER'];

export function Events({ nav, back }: { nav: Nav; back: () => void }) {
  const { events, reload } = useLedger();
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<EventType>('WEDDING');
  const [ownerSide, setOwnerSide] = useState<OwnerSide>('OTHERS');
  const [title, setTitle] = useState('');

  async function create() {
    const t = Date.now();
    const ev: EventRec = {
      id: newId(),
      type,
      title: title.trim() || `${EVENT_LABEL[type]} (${ownerSide === 'MINE' ? '내 경조사' : '타인'})`,
      ownerSide,
      date: t,
      createdAt: t,
      updatedAt: t,
    };
    await eventRepo.put(ev);
    await reload();
    setCreating(false);
    setTitle('');
    nav({ name: 'event', id: ev.id });
  }

  return (
    <>
      <TopBar title="경조사" onBack={back} />
      <div className="content" style={{ paddingBottom: 90 }}>
        {events.length === 0 && !creating && <div className="center">아직 경조사가 없어요</div>}
        {events.map((e) => (
          <div key={e.id} className="card list-item" style={{ marginBottom: 8 }} onClick={() => nav({ name: 'event', id: e.id })}>
            <div>
              <b>{e.title}</b>
              <div className="muted">
                {EVENT_LABEL[e.type]} · {e.ownerSide === 'MINE' ? '내 경조사' : '타인'} · {formatDate(e.date)}
              </div>
            </div>
            <span className="muted">›</span>
          </div>
        ))}

        {creating && (
          <div className="card">
            <label className="lbl">종류</label>
            <div className="chips">
              {TYPES.map((t) => (
                <button key={t} className="chip" style={t === type ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : {}} onClick={() => setType(t)}>
                  {EVENT_LABEL[t]}
                </button>
              ))}
            </div>
            <label className="lbl">누구의 경조사</label>
            <div className="seg">
              <button className={ownerSide === 'OTHERS' ? 'on' : ''} onClick={() => setOwnerSide('OTHERS')}>다른 사람 (내가 줌)</button>
              <button className={ownerSide === 'MINE' ? 'on' : ''} onClick={() => setOwnerSide('MINE')}>내 경조사 (받음)</button>
            </div>
            <label className="lbl">제목 (선택)</label>
            <input className="field" placeholder="예: 김철수 결혼식" value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="primary" style={{ marginTop: 14 }} onClick={create}>만들기</button>
          </div>
        )}
      </div>

      {!creating && <button className="primary fab" onClick={() => setCreating(true)}>+ 새 경조사</button>}
    </>
  );
}
