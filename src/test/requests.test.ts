import { describe, expect, it } from 'vitest';
import {
  accept,
  addDays,
  askEveryone,
  askSomeoneElse,
  canAccept,
  cannot,
  confirm,
  current,
  giveBack,
  markDone,
  moveTo,
  needsChoice,
  nextPerson,
  notYet,
  sectionsFor,
  sinceLastHere,
  nothingNew,
} from '../lib/logic/requests';
import type { HelpRequest, Member } from '../lib/model/types';
import { DAY, HOUR, NOW, entry } from './fixtures';

const sam = { uid: 'u1', name: 'Sam' };
const jo = { uid: 'u2', name: 'Jo' };
const al = { uid: 'u3', name: 'Al' };

const member = (who: { uid: string; name: string }, joinedAt: number, role: Member['role'] = 'family'): Member => ({
  ...who,
  role,
  sees: { log: true, medicines: true, about: false, papers: false },
  joinedAt,
});
const members = [member(sam, 1, 'lead'), member(jo, 2), member(al, 3), member({ uid: 'u4', name: 'Viewer' }, 4, 'viewer')];

function request(partial: Partial<HelpRequest> = {}): HelpRequest {
  return {
    id: 'r1',
    what: 'Do the food shop',
    askedOf: 'everyone',
    askedAt: NOW,
    state: 'asked',
    changedAt: NOW,
    changedName: 'Sam',
    createdBy: 'u1',
    createdName: 'Sam',
    ...partial,
  };
}

describe('requests for help', () => {
  it('go asked, accepted, done, confirmed', () => {
    let r = request();
    expect(canAccept(r, 'u2')).toBe(true);
    expect(canAccept(r, 'u1')).toBe(false);
    r = accept(r, jo, NOW + 1);
    expect(r).toMatchObject({ state: 'accepted', acceptedBy: 'u2', acceptedName: 'Jo', changedName: 'Jo' });
    expect(canAccept(r, 'u3')).toBe(false);
    r = markDone(r, jo, NOW + 2);
    expect(r.state).toBe('done');
    expect(notYet(r, sam, NOW + 3).state).toBe('accepted');
    r = confirm(r, sam, NOW + 3);
    expect(r).toMatchObject({ state: 'confirmed', changedAt: NOW + 3 });
  });

  it('only the person asked by name can say yes, and saying no keeps it open for the carer', () => {
    const r = request({ askedOf: 'u2', askedName: 'Jo' });
    expect(canAccept(r, 'u2')).toBe(true);
    expect(canAccept(r, 'u3')).toBe(false);
    const no = cannot(r, jo, NOW + HOUR);
    expect(no.state).toBe('asked');
    expect(needsChoice(no, NOW + HOUR, '2026-10-14')).toBe(true);
  });

  it('giving it back after saying yes reopens it from now', () => {
    const r = giveBack(accept(request(), jo, NOW), jo, NOW + 5 * HOUR);
    expect(r.state).toBe('asked');
    expect(r.acceptedBy).toBeUndefined();
    expect(r.askedAt).toBe(NOW + 5 * HOUR);
    expect(canAccept(r, 'u2')).toBe(false);
    expect(canAccept(r, 'u3')).toBe(true);
  });

  it('asks the carer to choose after a day, or when the day is close', () => {
    expect(needsChoice(request(), NOW + 23 * HOUR, '2026-10-14')).toBe(false);
    expect(needsChoice(request(), NOW + 24 * HOUR, '2026-10-15')).toBe(true);
    expect(needsChoice(request({ day: '2026-10-15' }), NOW + HOUR, '2026-10-14')).toBe(true);
    expect(needsChoice(request({ day: '2026-10-20' }), NOW + HOUR, '2026-10-14')).toBe(false);
    expect(needsChoice(accept(request(), jo, NOW), NOW + 3 * DAY, '2026-10-17')).toBe(false);
  });

  it('offers the next person, never the carer, a viewer or someone who said no', () => {
    const r = cannot(request({ askedOf: 'u2', askedName: 'Jo' }), jo, NOW);
    expect(nextPerson(r, members)?.uid).toBe('u3');
    expect(nextPerson(cannot(r, al, NOW), members)).toBeUndefined();
  });

  it('the three choices restart the wait and never send anything', () => {
    const r = cannot(request({ askedOf: 'u2', askedName: 'Jo' }), jo, NOW);
    const later = NOW + 2 * DAY;
    expect(askSomeoneElse(r, al, sam, later)).toMatchObject({ askedOf: 'u3', askedName: 'Al', askedAt: later });
    const all = askEveryone(r, sam, later);
    expect(all).toMatchObject({ askedOf: 'everyone', askedAt: later, cannot: [] });
    expect(all.askedName).toBeUndefined();
    expect(moveTo(r, '2026-10-30', sam, later)).toMatchObject({ day: '2026-10-30', askedAt: later });
  });

  it('carries only the About sections the carer ticks', () => {
    const about = {
      sections: { communication: 'Short sentences.', safety: 'Watch the stairs.', life: 'Worked at the mill.' },
      helps: [{ code: 'h1', text: 'Her music', count: 2 }],
      worse: [],
      updatedAt: NOW,
    };
    expect(sectionsFor(about, ['safety', 'communication', 'eating'], false)).toEqual([
      { title: 'How they communicate', text: 'Short sentences.' },
      { title: 'Keeping them safe', text: 'Watch the stairs.' },
    ]);
    expect(sectionsFor(about, [], true)).toEqual([{ title: 'What helps', text: 'Her music' }]);
  });

  it('lists what needs the carer first and drops old confirmed ones', () => {
    const list = current(
      [
        request({ id: 'a' }),
        request({ id: 'b', state: 'done' }),
        request({ id: 'c', state: 'confirmed', changedAt: NOW - 8 * DAY }),
        request({ id: 'd', state: 'confirmed', changedAt: NOW - DAY }),
      ],
      NOW,
    );
    expect(list.map((r) => r.id)).toEqual(['b', 'a', 'd']);
  });

  it('adds days across a month end', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('shows a helper what changed since they were last here, not their own writing', () => {
    const since = NOW - DAY;
    const s = sinceLastHere(
      {
        entries: [entry({ kind: 'note', at: NOW - HOUR, author: 'u1' }), entry({ kind: 'note', at: NOW - HOUR, author: 'u2' }), entry({ kind: 'night', at: NOW - 2 * DAY })],
        doses: [
          { id: 'd1', medicineId: 'm1', at: NOW - HOUR, outcome: 'given', reason: 'agitation', by: 'u1', byName: 'Sam' },
          { id: 'd2', medicineId: 'm2', at: NOW - HOUR, outcome: 'given', by: 'u1', byName: 'Sam' },
        ],
        medicines: [],
        messages: [{ id: 'm', at: NOW - HOUR, by: 'u1', byName: 'Sam', text: 'Back at six' }],
        requests: [request({ changedAt: NOW - 2 * DAY })],
        about: undefined,
      },
      since,
      'u2',
    );
    expect(s.entries).toHaveLength(1);
    expect(s.given.map((d) => d.id)).toEqual(['d1']);
    expect(s.messages).toHaveLength(1);
    expect(s.requests).toHaveLength(0);
    expect(nothingNew(s)).toBe(false);
    expect(nothingNew(sinceLastHere({ entries: [], doses: [], medicines: [], messages: [], requests: [], about: undefined }, since, 'u2'))).toBe(true);
  });
});
