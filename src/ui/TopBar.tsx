import type { ReactNode } from 'react';

export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="back" onClick={onBack} aria-label="뒤로">
          ‹
        </button>
      )}
      <h1>{title}</h1>
      {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
    </div>
  );
}
