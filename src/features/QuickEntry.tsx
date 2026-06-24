import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import {
  addEntry,
  confirmMergeAndSave,
  saveAsNewPerson,
  type NewEntryInput,
} from '../data/ledgerService';
import { eventRepo } from '../data/repositories/eventRepo';
import { pickContact } from '../platform/contacts';
import { newId } from '../lib/id';
import { formatMan, EVENT_LABEL } from '../ui/format';
import type { Direction, Person, EventType, OwnerSide } from '../domain/models';

const CHIPS = [50000, 100000, 200000, 300000, 500000];
const TYPES: EventType[] = ['WEDDING', 'FUNERAL', 'DOL', 'HOUSEWARMING', 'BIRTHDAY', 'OTHER'];

export function QuickEntry({ nav, back, eventId }: { nav: Nav; back: () => void; eventId?: string }) {
  const { events, reload } = useLedger();
  const fixedEvent = eventId ? events.find((e) => e.id === eventId) : undefined;
  const lockedToEvent = Boolean(eventId);

  function dirFromOwner(side: OwnerSide): Direction {
    return side === 'MINE' ? 'RECEIVED' : 'GIVEN';
  }

  const [direction, setDirection] = useState<Direction>(
    fixedEvent ? dirFromOwner(fixedEvent.ownerSide) : 'RECEIVED',
  );
  const [selectedEventId, setSelectedEventId] = useState<string | null>(eventId ?? null);
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState<{ candidates: Person[]; input: NewEntryInput } | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // "직접" 경조사 추가
  const [showCustom, setShowCustom] = useState(false);
  const [customType, setCustomType] = useState<EventType>('WEDDING');
  const [customTitle, setCustomTitle] = useState('');

  const amountNum = amount ? parseInt(amount, 10) : null;
  const canSave = name.trim().length > 0 && amountNum !== null && amountNum > 0;

  function pickEvent(id: string | null) {
    setSelectedEventId(id);
    const ev = events.find((e) => e.id === id);
    if (ev) setDirection(dirFromOwner(ev.ownerSide));
  }

  async function createCustomEvent() {
    const t = Date.now();
    const ownerSide: OwnerSide = direction === 'RECEIVED' ? 'MINE' : 'OTHERS';
    const id = newId();
    await eventRepo.put({
      id,
      type: customType,
      title: customTitle.trim() || `${EVENT_LABEL[customType]} (${ownerSide === 'MINE' ? '내 경조사' : '타인'})`,
      ownerSide,
      date: t,
      createdAt: t,
      updatedAt: t,
    });
    await reload();
    setSelectedEventId(id);
    setShowCustom(false);
    setCustomTitle('');
  }

  async function onPickContact() {
    try {
      const c = await pickContact();
      if (c) {
        if (c.name) setName(c.name);
        if (c.phone) setPhone(c.phone);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  function buildInput(): NewEntryInput {
    const t = Date.now();
    return {
      name: name.trim(),
      phoneRaw: phone.trim() || null,
      direction,
      amount: amountNum,
      eventId: selectedEventId,
      date: t,
      now: t,
      newId,
    };
  }

  async function afterSave() {
    await reload();
    setSavedCount((c) => c + 1);
    setAmount('');
    setName('');
    setPhone('');
  }

  async function onSave() {
    const res = await addEntry(buildInput());
    if (res.kind === 'NEEDS_MERGE_DECISION') {
      setPending({ candidates: res.candidates, input: res.pending });
      return;
    }
    await afterSave();
  }

  async function resolveSame() {
    if (!pending) return;
    await confirmMergeAndSave(pending.candidates[0]!.id, pending.input);
    setPending(null);
    await afterSave();
  }
  async function resolveNew() {
    if (!pending) return;
    await saveAsNewPerson(pending.input);
    setPending(null);
    await afterSave();
  }

  const recentEvents = events.slice(0, 6);

  return (
    <>
      <TopBar title={fixedEvent ? fixedEvent.title : '기록 추가'} onBack={back} />
      <div className="content" style={{ paddingBottom: 96 }}>
        <div className="seg">
          <button className={direction === 'RECEIVED' ? 'on' : ''} onClick={() => setDirection('RECEIVED')}>받음</button>
          <button className={direction === 'GIVEN' ? 'on' : ''} onClick={() => setDirection('GIVEN')}>줌</button>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <input
            className="amount"
            inputMode="numeric"
            placeholder="0"
            value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
            autoFocus
          />
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c} className="chip" onClick={() => setAmount(String((amountNum ?? 0) + c))}>
                +{formatMan(c)}
              </button>
            ))}
            <button className="chip" onClick={() => setAmount('')}>지우기</button>
          </div>

          <label className="lbl">이름</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ flex: 1 }} placeholder="이름 (필수)" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="ghost" onClick={onPickContact}>연락처</button>
          </div>
          <label className="lbl">전화번호 (선택 — 같은 사람 자동 정리)</label>
          <input className="field" inputMode="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        {!lockedToEvent && (
          <div className="card">
            <label className="lbl" style={{ marginTop: 0 }}>경조사 (선택)</label>
            <div className="chips">
              <button className="chip" style={selectedEventId === null ? sel : {}} onClick={() => pickEvent(null)}>없음</button>
              {recentEvents.map((e) => (
                <button key={e.id} className="chip" style={selectedEventId === e.id ? sel : {}} onClick={() => pickEvent(e.id)}>
                  {e.title}
                </button>
              ))}
              <button className="chip" onClick={() => setShowCustom((s) => !s)}>+ 직접</button>
            </div>

            {showCustom && (
              <div style={{ marginTop: 8 }}>
                <div className="chips">
                  {TYPES.map((t) => (
                    <button key={t} className="chip" style={t === customType ? sel : {}} onClick={() => setCustomType(t)}>
                      {EVENT_LABEL[t]}
                    </button>
                  ))}
                </div>
                <input className="field" placeholder="제목 (선택, 예: 김철수 결혼식)" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                <button className="ghost" style={{ marginTop: 8 }} onClick={createCustomEvent}>이 경조사로 추가</button>
              </div>
            )}
          </div>
        )}

        {savedCount > 0 && (
          <div className="muted" style={{ textAlign: 'center' }}>
            {savedCount}건 저장됨 — 이어서 입력하거나 완료하세요
          </div>
        )}
      </div>

      {pending && (
        <div className="card" style={{ position: 'fixed', left: 16, right: 16, bottom: 16, maxWidth: 448, margin: '0 auto' }}>
          <b>같은 사람인가요?</b>
          <div className="muted" style={{ margin: '6px 0 12px' }}>
            "{pending.input.name}" 이름의 기록이 이미 있어요. (전화번호가 없어 자동 판단 불가)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ghost" style={{ flex: 1 }} onClick={resolveNew}>다른 사람</button>
            <button className="primary" style={{ flex: 1 }} onClick={resolveSame}>같은 사람</button>
          </div>
        </div>
      )}

      <div className="fab" style={{ display: 'flex', gap: 8 }}>
        {savedCount > 0 && <button className="ghost" style={{ flex: 1, background: '#fff' }} onClick={back}>완료</button>}
        <button className="primary" style={{ flex: 2 }} disabled={!canSave} onClick={onSave}>저장</button>
      </div>
    </>
  );
}

const sel: React.CSSProperties = { borderColor: 'var(--blue)', color: 'var(--blue)' };
