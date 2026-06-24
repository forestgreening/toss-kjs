import { useState } from 'react';
import { useLedger } from './store';
import { Home } from '../features/Home';
import { QuickEntry } from '../features/QuickEntry';
import { Events } from '../features/Events';
import { EventDetail } from '../features/EventDetail';
import { Ledger } from '../features/Ledger';
import { PersonDetail } from '../features/PersonDetail';
import { Backup } from '../features/Backup';
import { Settings } from '../features/Settings';

export type Screen =
  | { name: 'home' }
  | { name: 'quick'; eventId?: string }
  | { name: 'events' }
  | { name: 'event'; id: string }
  | { name: 'ledger' }
  | { name: 'person'; id: string }
  | { name: 'backup' }
  | { name: 'settings' };

export type Nav = (s: Screen) => void;

export function App() {
  const [stack, setStack] = useState<Screen[]>([{ name: 'home' }]);
  const screen = stack[stack.length - 1]!;
  const nav: Nav = (s) => setStack((st) => [...st, s]);
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st));
  const { ready } = useLedger();

  return <div className="app">{ready ? render(screen, nav, back) : <div className="center">불러오는 중…</div>}</div>;
}

function render(screen: Screen, nav: Nav, back: () => void) {
  switch (screen.name) {
    case 'home':
      return <Home nav={nav} />;
    case 'quick':
      return <QuickEntry nav={nav} back={back} eventId={screen.eventId} />;
    case 'events':
      return <Events nav={nav} back={back} />;
    case 'event':
      return <EventDetail nav={nav} back={back} id={screen.id} />;
    case 'ledger':
      return <Ledger nav={nav} back={back} />;
    case 'person':
      return <PersonDetail back={back} id={screen.id} />;
    case 'backup':
      return <Backup back={back} />;
    case 'settings':
      return <Settings nav={nav} back={back} />;
  }
}
