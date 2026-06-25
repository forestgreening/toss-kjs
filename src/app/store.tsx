// 앱 상태 스토어 (경량). 저장소(Dexie)에서 전체를 읽어 메모리에 보관하고,
// 변경 후 reload()로 갱신한다(데이터 규모가 작아 충분).

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { personRepo } from '../data/repositories/personRepo';
import { eventRepo } from '../data/repositories/eventRepo';
import { recordRepo } from '../data/repositories/recordRepo';
import type { Person, EventRec, LedgerRecord } from '../domain/models';

interface LedgerState {
  events: EventRec[];
  persons: Person[];
  records: LedgerRecord[];
  ready: boolean;
  reload: () => Promise<void>;
  personMap: Map<string, Person>;
}

const Ctx = createContext<LedgerState | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<EventRec[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [records, setRecords] = useState<LedgerRecord[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [e, p, r] = await Promise.all([eventRepo.all(), personRepo.all(), recordRepo.all()]);
    setEvents(e);
    setPersons(p);
    setRecords(r);
    setReady(true);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const personMap = useMemo(() => new Map(persons.map((p) => [p.id, p])), [persons]);

  const value = useMemo(
    () => ({ events, persons, records, ready, reload, personMap }),
    [events, persons, records, ready, reload, personMap],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLedger(): LedgerState {
  const v = useContext(Ctx);
  if (!v) throw new Error('LedgerProvider 안에서만 사용하세요.');
  return v;
}
