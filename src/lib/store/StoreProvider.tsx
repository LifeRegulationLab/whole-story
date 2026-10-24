import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import type {
  About,
  Carer,
  CheckIn,
  Circle,
  Contact,
  CoverRequest,
  CrisisPlan,
  Dose,
  Entry,
  HelpRequest,
  Medicine,
  Message,
  Paper,
  SavedAsk,
  Task,
} from '../model/types';
import { firebaseConfigured, firebase } from '../firebase/app';
import { loadCarer, myCircles, saveCarer, watchPlan, watchUser, type CircleWithMembers } from '../firebase/account';
import { SharedBackend } from '../firebase/shared';
import { COLLECTIONS, newId, PRIVATE, type Backend, type Collection, type DocName, type PrivateCollection } from './backend';
import { deviceStorage, LocalBackend } from './local';

/**
 * One place for everything on screen. Before an account, records stay on this device. With an
 * account, they live in the shared database and the device keeps a copy for when there is no signal.
 */

const DEVICE_PREFIX = 'whole-story:device';
const DEVICE_CIRCLE = 'whole-story:device:circle';
const DEVICE_CARER = 'whole-story:device:carer';
const ACTIVE_CIRCLE = 'whole-story:active-circle';

export const DEFAULT_LEVELS: Carer['levelWords'] = ['Fine', 'Managing', 'Stretched', 'Not coping'];

export interface Data {
  entries: Entry[];
  doses: Dose[];
  medicines: Medicine[];
  contacts: Contact[];
  papers: Paper[];
  tasks: Task[];
  cover: CoverRequest[];
  messages: Message[];
  requests: HelpRequest[];
  asks: SavedAsk[];
  checkins: CheckIn[];
  about: About | undefined;
  crisis: CrisisPlan | undefined;
}

const EMPTY: Data = {
  entries: [],
  doses: [],
  medicines: [],
  contacts: [],
  papers: [],
  tasks: [],
  cover: [],
  messages: [],
  requests: [],
  asks: [],
  checkins: [],
  about: undefined,
  crisis: undefined,
};

export interface StoreValue {
  ready: boolean;
  /** Signed in to the shared database. */
  user: User | null;
  carer: Carer;
  circle: Circle | undefined;
  circles: CircleWithMembers[];
  /** The active circle with its members, when shared. */
  shared: CircleWithMembers | undefined;
  data: Data;
  backend: Backend;
  /** Device-only records, kept for moving into an account. */
  device: LocalBackend;
  canWrite: boolean;
  isLead: boolean;
  /** Has Whole Story Plus, which opens Ask. Testers have it through the server, not here. */
  plus: boolean;
  save: <T extends { id: string }>(collection: Collection | PrivateCollection, item: T) => Promise<void>;
  remove: (collection: Collection | PrivateCollection, id: string) => Promise<void>;
  saveDoc: <T>(name: DocName, value: T) => Promise<void>;
  saveCarer: (carer: Carer) => Promise<void>;
  setDeviceCircle: (circle: Circle) => void;
  chooseCircle: (id: string) => void;
  refreshCircles: () => Promise<void>;
}

const Ctx = createContext<StoreValue | null>(null);

function readJson<T>(key: string): T | undefined {
  try {
    const raw = deviceStorage().getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const device = useMemo(() => new LocalBackend(DEVICE_PREFIX, deviceStorage()), []);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!firebaseConfigured());
  const [deviceCircle, setDeviceCircleState] = useState<Circle | undefined>(() => readJson<Circle>(DEVICE_CIRCLE));
  const [carer, setCarerState] = useState<Carer>(
    () =>
      readJson<Carer>(DEVICE_CARER) ?? {
        uid: 'device',
        name: '',
        levelWords: DEFAULT_LEVELS,
        whatHelpsMe: [],
        helperOn: false,
      },
  );
  const [circles, setCircles] = useState<CircleWithMembers[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(() => deviceStorage().getItem(ACTIVE_CIRCLE) ?? undefined);
  const [plan, setPlan] = useState<{ uid: string; active: boolean } | undefined>();
  useEffect(() => {
    if (!user) return;
    return watchPlan(user.uid, (active) => setPlan({ uid: user.uid, active }));
  }, [user]);
  const [held, setHeld] = useState<{ owner: Backend | null; data: Data }>({ owner: null, data: EMPTY });

  useEffect(() => {
    if (!firebaseConfigured()) return;
    return watchUser((u) => {
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  const refreshCircles = useCallback(async () => {
    if (!user) return;
    const [list, stored] = await Promise.all([myCircles(user.uid).catch(() => []), loadCarer(user.uid).catch(() => undefined)]);
    setCircles(list);
    setCarerState((c) => stored ?? { ...c, uid: user.uid });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    void Promise.all([myCircles(user.uid).catch(() => []), loadCarer(user.uid).catch(() => undefined)]).then(([list, stored]) => {
      if (!live) return;
      setCircles(list);
      setCarerState((c) => stored ?? { ...c, uid: user.uid });
    });
    return () => {
      live = false;
    };
  }, [user]);

  const visibleCircles = user ? circles : [];
  const shared = user ? (visibleCircles.find((c) => c.id === activeId) ?? visibleCircles[0]) : undefined;
  const circle: Circle | undefined = shared ?? (user ? undefined : deviceCircle);

  const backend: Backend = useMemo(() => {
    if (user && shared) return new SharedBackend(firebase().db, shared.id, user.uid);
    return device;
  }, [user, shared, device]);

  useEffect(() => {
    // Records are kept with the backend they came from, so switching circles never shows the old one's.
    const put = (change: Partial<Data>) =>
      setHeld((h) => ({ owner: backend, data: { ...(h.owner === backend ? h.data : EMPTY), ...change } }));
    const unsubs = [...COLLECTIONS, ...PRIVATE].map((name) => backend.listen(name, (items) => put({ [name]: items })));
    unsubs.push(backend.listenDoc<About>('about', (v) => put({ about: v })));
    unsubs.push(backend.listenDoc<CrisisPlan>('crisis', (v) => put({ crisis: v })));
    return () => unsubs.forEach((u) => u());
  }, [backend]);
  const data = held.owner === backend ? held.data : EMPTY;

  const role = user && shared ? shared.members[user.uid]?.role : 'lead';

  const value: StoreValue = {
    ready: authReady,
    user,
    carer,
    circle,
    circles: visibleCircles,
    shared,
    data,
    backend,
    device,
    canWrite: role === 'lead' || role === 'family',
    isLead: role === 'lead',
    plus: Boolean(user && plan?.uid === user.uid && plan.active),
    save: (collection, item) => backend.save(collection, item),
    remove: (collection, id) => backend.remove(collection, id),
    saveDoc: (name, v) => backend.saveDoc(name, v),
    saveCarer: async (c) => {
      setCarerState(c);
      if (user) await saveCarer({ ...c, uid: user.uid });
      else deviceStorage().setItem(DEVICE_CARER, JSON.stringify(c));
    },
    setDeviceCircle: (c) => {
      deviceStorage().setItem(DEVICE_CIRCLE, JSON.stringify(c));
      setDeviceCircleState(c);
    },
    chooseCircle: (id) => {
      deviceStorage().setItem(ACTIVE_CIRCLE, id);
      setActiveId(id);
    },
    refreshCircles,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

/** Who is writing, for the 'by' fields. */
export function useAuthor(): { uid: string; name: string } {
  const { user, carer } = useStore();
  return { uid: user?.uid ?? 'device', name: carer.name || 'Me' };
}

export { newId };
export const DEVICE_KEYS = { circle: DEVICE_CIRCLE, carer: DEVICE_CARER };
