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
      {onBack && (
        <button className="back" onClick={onBack} aria-label="뒤로">
          ‹
        </button>
      )}
      <h1>{title}</h1>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        {onHome && (
          <button className="back" onClick={onHome} aria-label="홈" style={{ fontSize: 19 }}>
            🏠
          </button>
        )}
        {right}
      </div>
    </div>
  );
}
