// 인앱 다이얼로그 — 네이티브 confirm()/alert() 대체.
//  - 앱인토스 WebView에서 네이티브 다이얼로그는 막히거나 스타일이 어색할 수 있어 자체 모달로 통일.
//  - Promise 기반: `const ok = await confirm(...)`, `await alert(...)`.
//  - 한 번에 하나만 표시(간단·충분). scrim 클릭/취소는 confirm=false, alert=resolve.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}
export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
}

interface DialogApi {
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
  alert: (opts: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

type DialogState =
  | null
  | { kind: 'confirm'; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: 'alert'; opts: AlertOptions; resolve: () => void };

export function DialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  // 새 다이얼로그가 열리면 직전 다이얼로그의 Promise를 먼저 마무리(누수/행 방지).
  function resolvePrev(prev: DialogState) {
    if (!prev) return;
    if (prev.kind === 'confirm') prev.resolve(false);
    else prev.resolve();
  }

  const confirm = useCallback((o: ConfirmOptions | string) => {
    const opts = typeof o === 'string' ? { message: o } : o;
    return new Promise<boolean>((resolve) => {
      setState((prev) => {
        resolvePrev(prev);
        return { kind: 'confirm', opts, resolve };
      });
    });
  }, []);

  const alert = useCallback((o: AlertOptions | string) => {
    const opts = typeof o === 'string' ? { message: o } : o;
    return new Promise<void>((resolve) => {
      setState((prev) => {
        resolvePrev(prev);
        return { kind: 'alert', opts, resolve };
      });
    });
  }, []);

  const api = useMemo<DialogApi>(() => ({ confirm, alert }), [confirm, alert]);

  function close(result: boolean) {
    setState((s) => {
      if (s) {
        if (s.kind === 'confirm') s.resolve(result);
        else s.resolve();
      }
      return null;
    });
  }

  const confirmText = state?.opts.confirmText ?? '확인';

  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && (
        <div className="dialog-scrim" onClick={() => close(false)}>
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {state.opts.title && <b className="dialog-title">{state.opts.title}</b>}
            <div className="dialog-msg">{state.opts.message}</div>
            <div className="dialog-actions">
              {state.kind === 'confirm' && (
                <button className="ghost" style={{ flex: 1 }} onClick={() => close(false)}>
                  {state.opts.cancelText ?? '취소'}
                </button>
              )}
              <button
                className={state.kind === 'confirm' && state.opts.danger ? 'danger' : 'primary'}
                style={{ flex: 1 }}
                onClick={() => close(true)}
                autoFocus
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
