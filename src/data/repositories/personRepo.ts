import { db } from '../db';
import type { Person } from '../../domain/models';

export const personRepo = {
  put: (p: Person): Promise<string> => db.persons.put(p),
  get: (id: string): Promise<Person | undefined> => db.persons.get(id),
  all: (): Promise<Person[]> => db.persons.toArray(),
  byPhone: (e164: string): Promise<Person | undefined> =>
    db.persons.where('phoneE164').equals(e164).first(),
  delete: (id: string): Promise<void> => db.persons.delete(id),
  clear: (): Promise<void> => db.persons.clear(),
};
