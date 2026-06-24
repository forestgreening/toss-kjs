import { db } from '../db';
import type { EventRec } from '../../domain/models';

export const eventRepo = {
  put: (e: EventRec): Promise<string> => db.events.put(e),
  get: (id: string): Promise<EventRec | undefined> => db.events.get(id),
  all: (): Promise<EventRec[]> => db.events.orderBy('date').reverse().toArray(),
  delete: (id: string): Promise<void> => db.events.delete(id),
  clear: (): Promise<void> => db.events.clear(),
};
