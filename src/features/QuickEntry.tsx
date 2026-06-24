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
import { pickContact } from '../platform/contacts';
import { newId } from '../lib/id';
import { formatMan } from '../ui/format';
import type { Direction, Person, OwnerSide } from '../domain/models';

const CHIPS = [50000, 100000, 200000, 300000, 500000];
const OCCASIONS = ['결혼식', '장례식', '돌잔치', '집들이', '생일'];

export function QuickEntry({ nav, back, home, eventId }: { nav: Nav; back: () => void; home: () => void; eventId?: string }) {
  const { events, reload } = useLedger();
  const fixedEvent = eventId ? events.find((e) => e.id === eventId) : undefined;
  const lockedToEvent = Boolean(eventId);

  function dirFromOwner(side: OwnerSide): Direction {
    return side === 'MINE' ? 'RECEIVED' : 'GIVEN';
  }

  // 이벤트(내 경조사) 안에서면 받음, 홈에서 단건이면 "줌"이 기본
  // (받은 금액은 내 경조사에서 처리하므로, 단건 기록은 보통 내가 낸 것)
  const [direction, setDirection] = useState<Direction>(
    fixedEvent ? dirFromOwner(fixedEvent.ownerSide) : 'GIVEN',
  );
  const [amount, setAmount] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [occasion, setOccasion] = useState(''); // '' = 없음
  const [pending, setPending] = useState<{ candidates: Person[]; input: NewEntryInput } | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const amountNum = amount ? parseInt(amount, 10) : null;
  const canSave = name.trim().length > 0 && amountNum !== null && amountNum > 0;

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
      eventId: eventId ?? null,
      occasion: occasion.trim() || null,
      note: note.trim() || null,
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
    setNote('');
    // occasion은 유지(같은 경조사 연속 입력 편의)
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

  return (
    <>
      <TopBar title={fixedEvent ? fixedEvent.title : '기록 추가'} onBack={back} onHome={home} />
      <div className="content" style={{ paddingBottom: 96 }}>
        <div className="seg">
          <button className={direction === 'GIVEN' ? 'on' : ''} onClick={() => setDirection('GIVEN')}>보냈어요</button>
          <button className={direction === 'RECEIVED' ? 'on' : ''} onClick={() => setDirection('RECEIVED')}>받았어요</button>
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
          <label className="lbl">메모 (선택)</label>
          <input className="field" placeholder="예) 엄마의 작은할머니" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {!lockedToEvent && (
          <div className="card">
            <label className="lbl" style={{ marginTop: 0 }}>경조사 (선택)</label>
            <input
              className="field"
              placeholder="예) 결혼식, 외삼촌 환갑"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            />
            <div className="chips" style={{ marginTop: 8 }}>
              {OCCASIONS.map((o) => (
                <button key={o} className="chip" style={occasion === o ? sel : {}} onClick={() => setOccasion(o)}>
                  {o}
                </button>
              ))}
            </div>
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
