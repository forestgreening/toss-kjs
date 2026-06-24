import type { ReactNode } from 'react';

export function TopBar({
  title,
  onBack,
  onHome,
  right,
}: {
  title: string;
  onBack?: () => void;
  onHome?: () => void;
  right?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div style={{ width: 44 }}>
        {onBack && (
          <button className="back" onClick={onBack} aria-label="뒤로">
            <svg width="11" height="19" viewBox="0 0 11 19" fill="none">
              <path d="M9.5 1.5L2 9.5l7.5 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
      <h1>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifySelf: 'end' }}>
        {onHome && (
          <button className="back" onClick={onHome} aria-label="홈">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5L12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5.5 9.5V20h13V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        {right}
      </div>
    </div>
  );
}
