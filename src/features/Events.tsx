import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { eventRepo } from '../data/repositories/eventRepo';
import { newId } from '../lib/id';
import { EVENT_LABEL, formatDate } from '../ui/format';
import type { EventType, EventRec } from '../domain/models';

const TYPES: EventType[] = ['WEDDING', 'FUNERAL', 'DOL', 'HOUSEWARMING', 'BIRTHDAY', 'OTHER'];

export function Events({ nav, back, home }: { nav: Nav; back: () => void; home: () => void }) {
  const { events, reload } = useLedger();
  const [creating, setCreating] = useState(false);
  const [type, setType] = useState<EventType>('WEDDING');
  const [title, setTitle] = useState('');

  // 경조사(이벤트)는 "내 경조사" 정산 전용 — 여러 명에게서 받은 내역을 모은다.
  // 남에게 낸 건 홈에서 한 줄로 기록(별도 이벤트 불필요).
  async function create() {
    const t = Date.now();
    const ev: EventRec = {
      id: newId(),
      type,
      title: title.trim() || `내 ${EVENT_LABEL[type]}`,
      ownerSide: 'MINE',
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
      <TopBar title="내 경조사" onBack={back} onHome={home} />
      <div className="content" style={{ paddingBottom: 90 }}>
        {!creating && (
          <div className="muted" style={{ margin: '0 4px 12px' }}>
            내 경조사(결혼·돌·장례 등)에서 <b>받은 내역</b>을 정산해요.
            <br />남에게 낸 건 홈의 <b>기록 추가</b>로 바로 기록하세요.
          </div>
        )}

        {events.length === 0 && !creating && <div className="center">아직 내 경조사가 없어요</div>}

        {events.map((e) => (
          <div key={e.id} className="card list-item" style={{ marginBottom: 8 }} onClick={() => nav({ name: 'event', id: e.id })}>
            <div>
              <b>{e.title}</b>
              <div className="muted">
                {EVENT_LABEL[e.type]}
                {e.ownerSide === 'OTHERS' ? ' · 남의 경조사' : ''} · {formatDate(e.date)}
              </div>
            </div>
            <span className="muted">›</span>
          </div>
        ))}

        {creating && (
          <div className="card">
            <label className="lbl" style={{ marginTop: 0 }}>종류</label>
            <div className="chips">
              {TYPES.map((t) => (
                <button key={t} className="chip" style={t === type ? { borderColor: 'var(--blue)', color: 'var(--blue)' } : {}} onClick={() => setType(t)}>
                  {EVENT_LABEL[t]}
                </button>
              ))}
            </div>
            <label className="lbl">제목 (선택)</label>
            <input className="field" placeholder={`예: 내 ${EVENT_LABEL[type]}`} value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="primary" style={{ marginTop: 14 }} onClick={create}>만들기</button>
          </div>
        )}
      </div>

      {!creating && <button className="primary fab" onClick={() => setCreating(true)}>+ 내 경조사 추가</button>}
    </>
  );
}
