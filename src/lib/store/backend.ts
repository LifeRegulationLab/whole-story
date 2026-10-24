/**
 * Where a circle's records live. Two kinds: on this device only (no account, one carer), and the
 * shared Firebase database (an account, family can join). Screens only ever see this interface.
 */

export const COLLECTIONS = ['entries', 'doses', 'medicines', 'contacts', 'papers', 'tasks', 'cover', 'messages', 'requests', 'asks', 'appointments'] as const;
export type Collection = (typeof COLLECTIONS)[number];

/** Records that belong to the carer alone and are never shared with the circle. */
export const PRIVATE = ['checkins'] as const;
export type PrivateCollection = (typeof PRIVATE)[number];

export const DOCS = ['about', 'crisis'] as const;
export type DocName = (typeof DOCS)[number];

export interface Identified {
  id: string;
}

export type Unsubscribe = () => void;

export interface Backend {
  /** 'device' or 'shared', for the settings page. */
  kind: 'device' | 'shared';
  listen<T extends Identified>(collection: Collection | PrivateCollection, onChange: (items: T[]) => void): Unsubscribe;
  save<T extends Identified>(collection: Collection | PrivateCollection, item: T): Promise<void>;
  remove(collection: Collection | PrivateCollection, id: string): Promise<void>;
  listenDoc<T>(name: DocName, onChange: (value: T | undefined) => void): Unsubscribe;
  saveDoc<T>(name: DocName, value: T): Promise<void>;
}

export function newId(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 16);
}

/** Firestore refuses `undefined`; JSON-safe copies keep both backends the same. */
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
