import type { Nav } from '../app/App';
import { useLedger } from '../app/store';
import { TopBar } from '../ui/TopBar';
import { formatKRW, formatValue, formatDate } from '../ui/format';
import { rowButton } from '../ui/rowProps';
import { AdBanner } from '../ui/AdBanner';
import { seedSample, isSeedActive, clearSeed } from '../data/seed';
import { reminderState, getLastBackupAt } from '../data/backupMeta';
import type { Direction, LedgerRecord } from '../domain/models';

function sum(records: LedgerRecord[], dir: Direction): number {
  return records
    .filter((r) => r.direction === dir && !r.deletedAt && !r.giftName && typeof r.amount === 'number')
    .reduce((s, r) => s + (r.amount as number), 0);
}

const Chev = () => (
  <svg className="chev" width="8" height="14" viewBox="0 0 8 14">
    <path d="M1 1l6 6-6 6" stroke="#c4cbd4" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Home({ nav }: { nav: Nav }) {
  const { events, records, personMap, reload } = useLedger();
  const onSeed = async () => {
    await seedSample(Date.now());
    await reload();
  };
  const onClearSeed = async () => {
    await clearSeed();
    await reload();
  };

  const recv = sum(records, 'RECEIVED');
  const give = sum(records, 'GIVEN');
  const net = recv - give;
  const recent = records
    .filter((r) => !r.deletedAt)
    .slice()
    .sort((a, b) => b.date - a.date || b.createdAt - a.createdAt)
    .slice(0, 5);

  const backupReminder = reminderState(getLastBackupAt(), records.filter((r) => !r.deletedAt).length);

  const gear = (
    <button className="back" aria-label="설정" onClick={() => nav({ name: 'settings' })}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3.1" stroke="#454c54" strokeWidth="1.7" />
        <path d="M12 2.6v2.3M12 19.1v2.3M21.4 12h-2.3M5.2 12H2.9M18.6 5.4l-1.6 1.6M7 17l-1.6 1.6M18.6 18.6L17 17M7 7L5.4 5.4" stroke="#454c54" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    </button>
  );

  return (
    <>
      <TopBar title="마음장부" right={gear} />
      <div className="content">
        <div className="muted" style={{ margin: '2px 2px 14px' }}>경조사 주고받기 · 마음을 기록해요</div>

        {isSeedActive() && (
          <div className="card" style={{ background: '#fff8e1', boxShadow: 'none', border: '1px solid #ffe1b3' }}>
            <div className="row">
              <span style={{ fontSize: 14 }}>📌 예시 데이터를 둘러보는 중이에요</span>
              <button className="pill" style={{ background: '#fff', border: '1px solid #ffd18a', color: '#9a6a00' }} onClick={onClearSeed}>예시 지우기</button>
            </div>
          </div>
        )}

        {backupReminder.show && (
          <div
            className="card"
            {...rowButton(() => nav({ name: 'backup' }))}
            style={{
              background: backupReminder.tone === 'warn' ? '#fff1f0' : 'var(--blue-weak)',
              boxShadow: 'none',
              border: backupReminder.tone === 'warn' ? '1px solid #ffccc7' : '1px solid #d6e4ff',
            }}
          >
            <div className="row">
              <span style={{ fontSize: 13.5, color: '#4b5563', lineHeight: 1.5 }}>
                {backupReminder.tone === 'warn' ? '⚠️ ' : '💾 '}
                {backupReminder.text}
              </span>
              <span className="pill" style={{ whiteSpace: 'nowrap' }}>백업하기</span>
            </div>
          </div>
        )}

        {/* hero */}
        <div className="hero">
          <div className="label">그동안 주고받은 마음</div>
          <div className="net">{formatKRW(net)}</div>
          <div className="subs">
            <div className="sub"><div className="k">받은 마음</div><div className="v">{formatKRW(recv)}</div></div>
            <div className="sub"><div className="k">보낸 마음</div><div className="v">{formatKRW(give)}</div></div>
          </div>
        </div>

        {/* menu */}
        <button className="menu-card" onClick={() => nav({ name: 'events' })}>
          <div className="icon-tile">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
              <path d="M3 13h4l2 3h6l2-3h4" stroke="#3182f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 13V6a2 2 0 012-2h10a2 2 0 012 2v7" stroke="#3182f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="#3182f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>내 경조사</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>내가 받은 축의·조의를 정산해요</div>
          </div>
          <Chev />
        </button>

        <button className="menu-card" onClick={() => nav({ name: 'ledger' })}>
          <div className="icon-tile green">
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
              <circle cx="9" cy="8" r="3.2" stroke="#00b25b" strokeWidth="1.8" />
              <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#00b25b" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M16 6.2a3 3 0 010 5.6M18.5 19c0-2.4-1.3-4.2-3.2-4.8" stroke="#00b25b" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700 }}>사람별 장부</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>누구와 얼마 주고받았는지 한눈에</div>
          </div>
          <Chev />
        </button>

        {records.length === 0 && (
          <div className="card" style={{ background: 'var(--blue-weak)', boxShadow: 'none' }}>
            <b>처음이신가요?</b>
            <div className="muted" style={{ margin: '8px 0 14px', lineHeight: 1.7, color: '#4b5563' }}>
              ① 내 결혼·돌 등에서 <b>받은</b> 건 [내 경조사]에서 정산<br />
              ② 남에게 <b>보낸</b> 축의·조의는 아래 [기록 추가]로<br />
              → 사람별 장부에서 한눈에 모여요
            </div>
            <button className="ghost" style={{ width: '100%' }} onClick={onSeed}>예시로 둘러보기</button>
          </div>
        )}

        {/* recent */}
        <div className="card" style={{ padding: '6px 18px 8px' }}>
          <div className="row" style={{ padding: '14px 0 6px' }}>
            <b style={{ fontSize: 15 }}>최근 기록</b>
            <button className="pill" onClick={() => nav({ name: 'ledger' })}>전체</button>
          </div>
          {recent.length === 0 ? (
            <div className="center" style={{ padding: '20px 0' }}>아직 기록이 없어요</div>
          ) : (
            recent.map((r) => {
              const occ = r.occasion ?? events.find((e) => e.id === r.eventId)?.title ?? null;
              return (
                <div key={r.id} className="list-item" {...rowButton(() => nav({ name: 'person', id: r.personId }))}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{personMap.get(r.personId)?.displayName ?? '(이름 없음)'}</div>
                    <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`tag ${r.direction === 'RECEIVED' ? 'tag-recv' : 'tag-give'}`}>{r.direction === 'RECEIVED' ? '받음' : '보냄'}</span>
                      <span className="muted" style={{ fontSize: 12 }}>{occ ? `${occ} · ` : ''}{formatDate(r.date)}</span>
                    </div>
                  </div>
                  <b style={{ fontSize: 14.5, whiteSpace: 'nowrap' }}>{formatValue(r.amount, r.giftName)}</b>
                </div>
              );
            })
          )}
        </div>

        <AdBanner />
      </div>

      <button className="primary fab" onClick={() => nav({ name: 'quick' })}>+ 기록 추가</button>
    </>
  );
}
