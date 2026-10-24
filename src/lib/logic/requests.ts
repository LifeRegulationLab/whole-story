import type { About, Dose, Entry, HelpRequest, Medicine, Member, Message } from '../model/types';
import { ABOUT_SECTIONS } from '../content/care';

/**
 * Requests for help. One set of states for every kind of help: asked, accepted, done, confirmed.
 * Nothing here sends a message. When nobody says yes, the carer is offered a choice.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Hours a request waits before the carer is asked what to do next. */
export const WAIT_HOURS = 24;

/** The saved requests a carer starts with. They change or remove them; these are only a start. */
export function startingAsks(personName: string): string[] {
  return [
    'Do the food shop',
    'A lift to an appointment',
    'See to the pets',
    'Help with a form or letter',
    `Sit with ${personName} so I can go out`,
    `Keep ${personName} company for an hour`,
  ];
}

export interface Who {
  uid: string;
  name: string;
}

export function stamp(r: HelpRequest, who: Who, now: number): HelpRequest {
  return { ...r, changedAt: now, changedName: who.name };
}

/** Whether this person can say yes to it. */
export function canAccept(r: HelpRequest, uid: string): boolean {
  if (r.state !== 'asked' || r.createdBy === uid) return false;
  if (r.askedOf === 'everyone') return !(r.cannot ?? []).includes(uid);
  return r.askedOf === uid;
}

export function accept(r: HelpRequest, who: Who, now: number): HelpRequest {
  return stamp({ ...r, state: 'accepted', acceptedBy: who.uid, acceptedName: who.name }, who, now);
}

/** Someone asked by name says they cannot. It stays asked, so the carer sees it and chooses. */
export function cannot(r: HelpRequest, who: Who, now: number): HelpRequest {
  const list = [...new Set([...(r.cannot ?? []), who.uid])];
  return stamp({ ...r, cannot: list }, who, now);
}

/** The helper pulls out after saying yes. It goes back to asked, from now. */
export function giveBack(r: HelpRequest, who: Who, now: number): HelpRequest {
  const next: HelpRequest = { ...r, state: 'asked', askedAt: now, cannot: [...new Set([...(r.cannot ?? []), who.uid])] };
  delete next.acceptedBy;
  delete next.acceptedName;
  return stamp(next, who, now);
}

export function markDone(r: HelpRequest, who: Who, now: number): HelpRequest {
  return stamp({ ...r, state: 'done' }, who, now);
}

/** Only the person who asked confirms it, or sends it back if it is not done yet. */
export function confirm(r: HelpRequest, who: Who, now: number): HelpRequest {
  return stamp({ ...r, state: 'confirmed' }, who, now);
}

export function notYet(r: HelpRequest, who: Who, now: number): HelpRequest {
  return stamp({ ...r, state: 'accepted' }, who, now);
}

/** The carer's choices when nobody has said yes. */
export function askSomeoneElse(r: HelpRequest, member: Who, who: Who, now: number): HelpRequest {
  return stamp({ ...r, askedOf: member.uid, askedName: member.name, askedAt: now }, who, now);
}

export function askEveryone(r: HelpRequest, who: Who, now: number): HelpRequest {
  const next: HelpRequest = { ...r, askedOf: 'everyone', askedAt: now, cannot: [] };
  delete next.askedName;
  return stamp(next, who, now);
}

export function moveTo(r: HelpRequest, day: string, who: Who, now: number): HelpRequest {
  return stamp({ ...r, day, askedAt: now, cannot: [] }, who, now);
}

/**
 * Nobody has said yes: it has waited a day, everyone asked by name has said no, or the day is
 * tomorrow or sooner. `today` is "YYYY-MM-DD".
 */
export function needsChoice(r: HelpRequest, now: number, today: string): boolean {
  if (r.state !== 'asked') return false;
  if (r.askedOf !== 'everyone' && (r.cannot ?? []).includes(r.askedOf)) return true;
  if (now - r.askedAt >= WAIT_HOURS * HOUR) return true;
  if (r.day && r.day <= addDays(today, 1)) return true;
  return false;
}

/** The next person to ask: in the circle, not the carer, not already asked or said no. */
export function nextPerson(r: HelpRequest, members: Member[]): Member | undefined {
  const tried = new Set([r.createdBy, r.askedOf, ...(r.cannot ?? [])]);
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt).find((m) => !tried.has(m.uid) && m.role !== 'viewer');
}

/** Copies of the ticked About sections, and what helps if ticked, for a request. */
export function sectionsFor(about: About | undefined, keys: string[], withHelps: boolean): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = [];
  for (const s of ABOUT_SECTIONS) {
    const text = about?.sections[s.key]?.trim();
    if (text && keys.includes(s.key)) out.push({ title: s.title, text });
  }
  if (withHelps && about?.helps.length) out.push({ title: 'What helps', text: about.helps.map((h) => h.text).join('\n') });
  return out;
}

/** Requests to show: open ones, and confirmed ones from the last week. */
export function current(list: HelpRequest[], now: number): HelpRequest[] {
  const order: Record<HelpRequest['state'], number> = { done: 0, asked: 1, accepted: 2, confirmed: 3 };
  return list
    .filter((r) => r.state !== 'confirmed' || now - r.changedAt < 7 * DAY)
    .sort((a, b) => order[a.state] - order[b.state] || (a.day ?? '9').localeCompare(b.day ?? '9') || a.askedAt - b.askedAt);
}

export function stateText(r: HelpRequest): string {
  if (r.state === 'asked') return r.askedOf === 'everyone' ? 'Asked everyone' : `Asked ${r.askedName ?? 'one person'}`;
  if (r.state === 'accepted') return `${r.acceptedName ?? 'Someone'} is doing it`;
  if (r.state === 'done') return `${r.acceptedName ?? 'Someone'} says it is done`;
  return 'Done';
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n));
  return t.toISOString().slice(0, 10);
}

/** What changed since someone was last here: only from the records they can see. */
export interface SinceLastHere {
  entries: Entry[];
  given: Dose[];
  medicines: Medicine[];
  messages: Message[];
  requests: HelpRequest[];
  aboutChanged: boolean;
}

export function sinceLastHere(
  data: { entries: Entry[]; doses: Dose[]; medicines: Medicine[]; messages: Message[]; requests: HelpRequest[]; about: About | undefined },
  since: number,
  me: string,
): SinceLastHere {
  return {
    entries: data.entries.filter((e) => e.writtenAt > since && e.author !== me).sort((a, b) => a.at - b.at),
    given: data.doses.filter((d) => d.at > since && d.outcome === 'given' && d.reason !== undefined).sort((a, b) => a.at - b.at),
    medicines: data.medicines.filter((m) => m.addedAt > since),
    messages: data.messages.filter((m) => m.at > since && m.by !== me).sort((a, b) => a.at - b.at),
    requests: data.requests.filter((r) => r.changedAt > since).sort((a, b) => a.changedAt - b.changedAt),
    aboutChanged: Boolean(data.about && data.about.updatedAt > since),
  };
}

export function nothingNew(s: SinceLastHere): boolean {
  return !s.entries.length && !s.given.length && !s.medicines.length && !s.messages.length && !s.requests.length && !s.aboutChanged;
}
