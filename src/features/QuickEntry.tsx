import { useState } from 'react';
import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { useDialog } from '../ui/Dialog';
import {
  addEntry,
  confirmMergeAndSave,
  saveAsNewPerson,
  type NewEntryInput,
} from '../data/ledgerService';
import {
  pickContact,
  contactsSupported,
  usesTossContactList,
  fetchTossContacts,
  type TossContactsPage,
} from '../platform/contacts';
import { newId } from '../lib/id';
import { rowButton } from '../ui/rowProps';
import { formatMan, formatKRW, toDateInputValue, fromDateInputValue } from '../ui/format';
import type { Direction, Person, OwnerSide } from '../domain/models';

const CHIPS = [50000, 100000, 200000, 300000, 500000];
const OCCASIONS = ['결혼식', '장례식', '돌잔치', '집들이', '생일'];

export function QuickEntry({ nav, back, home, eventId }: { nav: Nav; back: () => void; home: () => void; eventId?: string }) {
  const { events, reload } = useLedger();
  const { alert } = useDialog();
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
  const [entryType, setEntryType] = useState<'money' | 'gift'>('money');
  const [amount, setAmount] = useState('');
  const [giftName, setGiftName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [occasion, setOccasion] = useState(''); // '' = 없음
  const [dateStr, setDateStr] = useState(toDateInputValue(Date.now()));
  const [toast, setToast] = useState('');
  const [pending, setPending] = useState<{ candidates: Person[]; input: NewEntryInput } | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // 토스 연락처 선택 바텀시트 상태
  const [tcOpen, setTcOpen] = useState(false);
  const [tcQuery, setTcQuery] = useState('');
  const [tcItems, setTcItems] = useState<TossContactsPage['result']>([]);
  const [tcOffset, setTcOffset] = useState(0);
  const [tcDone, setTcDone] = useState(false);
  const [tcLoading, setTcLoading] = useState(false);
  const [tcError, setTcError] = useState('');

  const amountNum = amount ? parseInt(amount, 10) : null;
  const canSave =
    name.trim().length > 0 &&
    (entryType === 'money' ? amountNum !== null && amountNum > 0 : giftName.trim().length > 0);

  async function onPickContact() {
    // 토스 WebView: 자체 목록·검색 바텀시트. 그 외: 웹 단일 picker.
    if (usesTossContactList()) {
      openTossPicker();
      return;
    }
    try {
      const c = await pickContact();
      if (c) {
        if (c.name) setName(c.name);
        if (c.phone) setPhone(c.phone);
      }
    } catch (e) {
      await alert(e instanceof Error ? e.message : String(e));
    }
  }

  const TC_PAGE = 30;

  async function loadTossPage(reset: boolean, contains: string) {
    setTcLoading(true);
    setTcError('');
    try {
      const offset = reset ? 0 : tcOffset;
      const page = await fetchTossContacts({
        size: TC_PAGE,
        offset,
        contains: contains.trim() || undefined,
      });
      setTcItems((prev) => (reset ? page.result : [...prev, ...page.result]));
      setTcOffset(page.nextOffset ?? offset + page.result.length);
      setTcDone(page.done || page.nextOffset == null);
    } catch (e) {
      setTcError(e instanceof Error ? e.message : String(e));
    } finally {
      setTcLoading(false);
    }
  }

  function openTossPicker() {
    setTcOpen(true);
    setTcQuery('');
    setTcItems([]);
    setTcOffset(0);
    setTcDone(false);
    setTcError('');
    void loadTossPage(true, '');
  }

  function chooseTossContact(cName: string, phoneNumber: string) {
    if (cName) setName(cName);
    if (phoneNumber) setPhone(phoneNumber);
    setTcOpen(false);
  }

  function buildInput(): NewEntryInput {
    const t = Date.now();
    return {
      name: name.trim(),
      phoneRaw: phone.trim() || null,
      direction,
      amount: amountNum,
      giftName: entryType === 'gift' ? giftName.trim() || null : null,
      eventId: eventId ?? null,
      occasion: occasion.trim() || null,
      note: note.trim() || null,
      date: fromDateInputValue(dateStr, t),
      now: t,
      newId,
    };
  }

  async function afterSave() {
    const valueStr = entryType === 'gift' ? giftName.trim() || '선물' : formatKRW(amountNum);
    setToast(`✓ ${name.trim()} · ${direction === 'RECEIVED' ? '받음' : '보냄'} ${valueStr} 기록했어요`);
    await reload();
    setSavedCount((c) => c + 1);
    setAmount('');
    setGiftName('');
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

  async function resolveWith(personId: string) {
    if (!pending) return;
    await confirmMergeAndSave(personId, pending.input);
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
        <div className="muted" style={{ margin: '6px 4px 0' }}>
          {direction === 'GIVEN' ? '내가 낸 마음을 적어요' : '내가 받은 마음을 적어요'}
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="seg" style={{ marginBottom: 14 }}>
            <button className={entryType === 'money' ? 'on' : ''} onClick={() => setEntryType('money')}>금액</button>
            <button className={entryType === 'gift' ? 'on' : ''} onClick={() => setEntryType('gift')}>선물</button>
          </div>

          {entryType === 'money' ? (
            <>
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
            </>
          ) : (
            <>
              <input
                className="field"
                placeholder="선물 (예: 배냇저고리, 기저귀 세트)"
                value={giftName}
                onChange={(e) => setGiftName(e.target.value)}
                autoFocus
              />
              <label className="lbl">추정 금액 (선택)</label>
              <input
                className="field"
                inputMode="numeric"
                placeholder="모르면 비워두세요"
                value={amount ? Number(amount).toLocaleString('ko-KR') : ''}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              />
            </>
          )}

          <label className="lbl">이름</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="field" style={{ flex: 1 }} placeholder="이름 (필수)" value={name} onChange={(e) => setName(e.target.value)} />
            {contactsSupported() && <button className="ghost" onClick={onPickContact}>연락처</button>}
          </div>
          <label className="lbl">전화번호 (선택 — 같은 사람 자동 정리)</label>
          <input className="field" inputMode="tel" placeholder="010-0000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label className="lbl">메모 (선택)</label>
          <input className="field" placeholder="예) 엄마의 작은할머니" value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="lbl">날짜</label>
          <input className="field" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
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

        {toast && (
          <div className="muted" role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--green)' }}>
            {toast}
          </div>
        )}
        {savedCount > 0 && (
          <div className="muted" style={{ textAlign: 'center' }}>
            {savedCount}건 저장됨 — 이어서 입력하거나 완료하세요
          </div>
        )}
      </div>

      {pending && (
        <div className="card" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 16, width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,.14)' }}>
          <b>이미 있는 분인가요?</b>
          <div className="muted" style={{ margin: '6px 0 10px' }}>
            "{pending.input.name}" 이름의 기록이 있어요. 같은 분이면 고르고, 아니면 새로 추가하세요.
          </div>
          {pending.candidates.map((c) => (
            <div key={c.id} className="list-item" {...rowButton(() => resolveWith(c.id))}>
              <div>
                <b>{c.displayName}</b>
                {c.note && <div className="muted">📝 {c.note}</div>}
              </div>
              <span className="muted">이 분이에요 ›</span>
            </div>
          ))}
          <button className="ghost" style={{ width: '100%', marginTop: 10 }} onClick={resolveNew}>다른 사람으로 추가</button>
        </div>
      )}

      {tcOpen && (
        <>
          <div
            onClick={() => setTcOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.3)', zIndex: 25 }}
          />
          <div
            className="card"
            style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 16, width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 26, boxShadow: '0 8px 24px rgba(0,0,0,.14)', maxHeight: '72vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b>연락처 선택</b>
              <button className="ghost" onClick={() => setTcOpen(false)}>닫기</button>
            </div>
            <input
              className="field"
              placeholder="이름으로 검색"
              value={tcQuery}
              onChange={(e) => {
                setTcQuery(e.target.value);
                void loadTossPage(true, e.target.value);
              }}
            />
            <div style={{ overflowY: 'auto', marginTop: 8 }}>
              {tcItems.map((c, i) => (
                <div key={`${c.phoneNumber}-${i}`} className="list-item" {...rowButton(() => chooseTossContact(c.name, c.phoneNumber))}>
                  <div>
                    <b>{c.name || '이름 없음'}</b>
                    <div className="muted">{c.phoneNumber}</div>
                  </div>
                  <span className="muted">선택 ›</span>
                </div>
              ))}
              {tcLoading && tcItems.length === 0 && (
                <div className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>불러오는 중…</div>
              )}
              {!tcLoading && tcItems.length === 0 && !tcError && (
                <div className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>연락처가 없어요</div>
              )}
              {tcError && (
                <div className="muted" style={{ color: 'var(--red, #e5484d)', padding: '8px 0' }}>{tcError}</div>
              )}
              {!tcDone && tcItems.length > 0 && (
                <button className="ghost" style={{ width: '100%', marginTop: 8 }} disabled={tcLoading} onClick={() => void loadTossPage(false, tcQuery)}>
                  {tcLoading ? '불러오는 중…' : '더 불러오기'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {!pending && (
        <div className="fab" style={{ display: 'flex', gap: 8 }}>
          {savedCount > 0 && <button className="ghost" style={{ flex: 1, background: '#fff' }} onClick={back}>완료</button>}
          <button className="primary" style={{ flex: 2 }} disabled={!canSave} onClick={onSave}>저장</button>
        </div>
      )}
    </>
  );
}

const sel: React.CSSProperties = { borderColor: 'var(--blue)', color: 'var(--blue)' };
