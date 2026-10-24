import {
  createUserWithEmailAndPassword,
  deleteUser,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Carer, Circle, Member, Role } from '../model/types';
import { clean, COLLECTIONS, newId } from '../store/backend';
import { firebase } from './app';

const EMAIL_KEY = 'whole-story:sign-in-email';

/** Sends a sign-in link. No password to remember. */
export async function sendLink(email: string): Promise<void> {
  const { auth } = firebase();
  await sendSignInLinkToEmail(auth, email, { url: `${window.location.origin}/signin`, handleCodeInApp: true });
  window.localStorage.setItem(EMAIL_KEY, email);
}

/** Finishes sign-in when the page was opened from the emailed link. Returns false if it was not. */
export async function finishLink(emailIfAsked?: string): Promise<'done' | 'need-email' | 'not-a-link'> {
  const { auth } = firebase();
  if (!isSignInWithEmailLink(auth, window.location.href)) return 'not-a-link';
  const email = emailIfAsked ?? window.localStorage.getItem(EMAIL_KEY);
  if (!email) return 'need-email';
  await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem(EMAIL_KEY);
  return 'done';
}

/**
 * Email and password. This works inside the app on a phone's home screen, where an emailed link
 * would open the browser instead. Returns an error to show, if any.
 */
export async function passwordSignIn(email: string, password: string, isNew: boolean): Promise<string | undefined> {
  const { auth } = firebase();
  try {
    if (isNew) await createUserWithEmailAndPassword(auth, email, password);
    else await signInWithEmailAndPassword(auth, email, password);
    return undefined;
  } catch (e) {
    const code = (e as { code?: string }).code ?? '';
    if (code.includes('email-already-in-use')) return 'There is already an account for that email. Choose "I have an account".';
    if (code.includes('weak-password')) return 'Use at least 8 characters.';
    if (code.includes('invalid-email')) return 'Check the email address.';
    if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'That email and password do not match.';
    if (code.includes('network')) return 'No signal. Try again when you have one.';
    return 'That did not work. Try again.';
  }
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebase().auth, email);
}

export function watchUser(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(firebase().auth, onChange);
}

export async function signOut(): Promise<void> {
  await fbSignOut(firebase().auth);
}

export type CircleWithMembers = Circle & { members: Record<string, Member>; memberIds: string[] };

export async function myCircles(uid: string): Promise<CircleWithMembers[]> {
  const { db } = firebase();
  const snap = await getDocs(query(collection(db, 'circles'), where('memberIds', 'array-contains', uid)));
  return snap.docs.map((d) => ({ ...(d.data() as CircleWithMembers), id: d.id }));
}

export async function createCircle(
  circle: Omit<Circle, 'id' | 'createdAt' | 'createdBy'>,
  uid: string,
  name: string,
): Promise<CircleWithMembers> {
  const { db } = firebase();
  const id = newId();
  const lead: Member = { uid, name, role: 'lead', sees: { log: true, medicines: true, about: true, papers: true }, joinedAt: Date.now() };
  const value: CircleWithMembers = { ...circle, id, createdAt: Date.now(), createdBy: uid, members: { [uid]: lead }, memberIds: [uid] };
  await setDoc(doc(db, 'circles', id), clean(value));
  return value;
}

export async function updateCircle(id: string, changes: Partial<Circle>): Promise<void> {
  await updateDoc(doc(firebase().db, 'circles', id), clean(changes) as Record<string, unknown>);
}

export interface Invite {
  code: string;
  circleId: string;
  personName: string;
  role: Role;
  sees: Member['sees'];
  createdBy: string;
  expiresAt: number;
}

/** An invite code for a relative. It works once and lasts seven days. */
export async function createInvite(circle: Circle, role: Role, sees: Member['sees'], uid: string): Promise<Invite> {
  const code = newId().slice(0, 8).toUpperCase();
  const invite: Invite = {
    code,
    circleId: circle.id,
    personName: circle.personName,
    role,
    sees,
    createdBy: uid,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  await setDoc(doc(firebase().db, 'invites', code), invite);
  return invite;
}

export async function joinWithCode(code: string, uid: string, name: string): Promise<string> {
  const { db } = firebase();
  const ref = doc(db, 'invites', code.trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That code was not found. Check it with the person who sent it.');
  const invite = snap.data() as Invite;
  if (invite.expiresAt < Date.now()) throw new Error('That code has run out. Ask for a new one.');
  const member: Member = { uid, name, role: invite.role, sees: invite.sees, joinedAt: Date.now() };
  await updateDoc(doc(db, 'circles', invite.circleId), {
    [`members.${uid}`]: { ...member, invite: invite.code },
    memberIds: arrayUnion(uid),
  });
  await deleteDoc(ref);
  return invite.circleId;
}

export async function removeMember(circle: CircleWithMembers, uid: string): Promise<void> {
  const members = Object.fromEntries(Object.entries(circle.members).filter(([k]) => k !== uid));
  await updateDoc(doc(firebase().db, 'circles', circle.id), {
    members,
    memberIds: circle.memberIds.filter((m) => m !== uid),
  });
}

export async function loadCarer(uid: string): Promise<Carer | undefined> {
  const snap = await getDoc(doc(firebase().db, 'users', uid));
  return snap.exists() ? (snap.data() as Carer) : undefined;
}

export async function saveCarer(carer: Carer): Promise<void> {
  await setDoc(doc(firebase().db, 'users', carer.uid), clean(carer));
}

/** Copies records kept on the device into a circle, the first time a carer makes an account. */
export async function importIntoCircle(circleId: string, data: Record<string, unknown>, uid: string): Promise<void> {
  const { db } = firebase();
  let batch = writeBatch(db);
  let count = 0;
  const flush = async () => {
    await batch.commit();
    batch = writeBatch(db);
    count = 0;
  };
  for (const name of COLLECTIONS) {
    const items = data[name];
    if (!Array.isArray(items)) continue;
    for (const item of items as { id: string }[]) {
      batch.set(doc(db, 'circles', circleId, name, item.id), clean(item));
      if (++count >= 400) await flush();
    }
  }
  for (const name of ['about', 'crisis']) {
    const value = data[`doc:${name}`];
    if (value) batch.set(doc(db, 'circles', circleId, 'docs', name), clean(value));
  }
  const checkins = data['checkins'];
  if (Array.isArray(checkins)) {
    for (const c of checkins as { id: string }[]) batch.set(doc(db, 'users', uid, 'checkins', c.id), clean(c));
  }
  await flush();
}

/**
 * Deletes the account. Circles this person leads are deleted with every record in them; other
 * circles simply lose them as a member. Run an export first if they want a copy.
 */
export async function deleteEverything(user: User): Promise<void> {
  const { db } = firebase();
  const circles = await myCircles(user.uid);
  for (const c of circles) {
    if (c.members[user.uid]?.role === 'lead') {
      for (const name of [...COLLECTIONS, 'docs']) {
        const snap = await getDocs(collection(db, 'circles', c.id, name));
        for (const d of snap.docs) await deleteDoc(d.ref);
      }
      await deleteDoc(doc(db, 'circles', c.id));
    } else {
      await removeMember(c, user.uid);
    }
  }
  const checkins = await getDocs(collection(db, 'users', user.uid, 'checkins'));
  for (const d of checkins.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}

/** Whether this carer has Whole Story Plus. Only the server writes plans. */
export function watchPlan(uid: string, onChange: (active: boolean) => void): () => void {
  return onSnapshot(
    doc(firebase().db, 'plans', uid),
    (d) => onChange(d.data()?.['active'] === true),
    () => onChange(false),
  );
}

/** Opens Stripe's page to buy Plus ('checkout') or to change or cancel it ('portal'). Returns an error to show, if any. */
export async function openBilling(which: 'checkout' | 'portal'): Promise<string | undefined> {
  const user = firebase().auth.currentUser;
  const url = import.meta.env[which === 'checkout' ? 'VITE_CHECKOUT_URL' : 'VITE_PORTAL_URL'];
  if (!user || !url) return 'Plus is not on sale yet.';
  try {
    const res = await fetch(String(url), { method: 'POST', headers: { authorization: `Bearer ${await user.getIdToken()}` } });
    const body = (await res.json().catch(() => ({}))) as { url?: string; text?: string };
    if (res.ok && body.url) {
      window.location.assign(body.url);
      return undefined;
    }
    return body.text ?? 'That did not open. Try again later.';
  } catch {
    return 'No signal. Try again when you have one.';
  }
}
