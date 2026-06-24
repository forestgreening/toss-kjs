export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="back" onClick={onBack} aria-label="뒤로">
          ‹
        </button>
      )}
      <h1>{title}</h1>
    </div>
  );
}
