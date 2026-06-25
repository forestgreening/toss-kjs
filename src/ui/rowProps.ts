// 클릭 가능한 비-button 요소(목록 행 등)에 키보드 접근성을 부여하는 헬퍼.
//  - 행 안에 별도 버튼이 중첩되는 경우 <button>으로 못 바꾸므로, role/tabIndex/keydown으로 보강.
//  - Enter/Space로 활성화. 시각 스타일은 그대로 유지(비침습적).
import type { KeyboardEvent } from 'react';

export function rowButton(onClick: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}
