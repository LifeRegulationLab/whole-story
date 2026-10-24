import {
  collection as col,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  clean,
  PRIVATE,
  type Backend,
  type Collection,
  type DocName,
  type Identified,
  type PrivateCollection,
} from '../store/backend';

/**
 * A circle's records in Firestore: circles/{circleId}/{collection}/{id}. The carer's own
 * check-ins live under users/{uid}/ and are never readable by the rest of the circle.
 */
export class SharedBackend implements Backend {
  readonly kind = 'shared' as const;

  constructor(
    private readonly db: Firestore,
    private readonly circleId: string,
    private readonly uid: string,
  ) {}

  private path(collection: Collection | PrivateCollection): string[] {
    return (PRIVATE as readonly string[]).includes(collection)
      ? ['users', this.uid, collection]
      : ['circles', this.circleId, collection];
  }

  listen<T extends Identified>(collection: Collection | PrivateCollection, onChange: (items: T[]) => void) {
    const [a, b, c] = this.path(collection) as [string, string, string];
    return onSnapshot(
      col(this.db, a, b, c),
      (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))),
      () => onChange([]),
    );
  }

  async save<T extends Identified>(collection: Collection | PrivateCollection, item: T) {
    const [a, b, c] = this.path(collection) as [string, string, string];
    // Not awaited past the local write: with no signal the write is queued and sent later.
    void setDoc(doc(this.db, a, b, c, item.id), clean(item));
  }

  async remove(collection: Collection | PrivateCollection, id: string) {
    const [a, b, c] = this.path(collection) as [string, string, string];
    void deleteDoc(doc(this.db, a, b, c, id));
  }

  listenDoc<T>(name: DocName, onChange: (value: T | undefined) => void) {
    return onSnapshot(
      doc(this.db, 'circles', this.circleId, 'docs', name),
      (snap) => onChange(snap.exists() ? (snap.data() as T) : undefined),
      () => onChange(undefined),
    );
  }

  async saveDoc<T>(name: DocName, value: T) {
    void setDoc(doc(this.db, 'circles', this.circleId, 'docs', name), clean(value) as Record<string, unknown>);
  }
}
