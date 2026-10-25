// The invented record behind the pictures of Whole Story (scripts/screenshots.mjs), printed as the
// device's local storage: a carer, Sam, writing about their mum, Rose. Everyone here is made up;
// phone numbers are in the range set aside for fiction, and the medicine labels are invented.
// Run: npx vite-node scripts/showcase-data.ts
import type { About, Appointment, Carer, Circle, Contact, Dose, Entry, Medicine, Task } from '../src/lib/model/types';

/** Tuesday 27 October 2026, 10:20 in London: the clock the pictures are taken at. */
export const NOW = new Date(2026, 9, 27, 10, 20).getTime();
const DAY = 86_400_000;
const at = (days: number, h = 9, m = 0) => {
  const d = new Date(NOW + days * DAY);
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
const ymd = (days: number) => {
  const d = new Date(at(days, 12));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
let n = 0;
const id = () => `show${String(++n).padStart(6, '0')}`;
const ME = { author: 'device', authorName: 'Sam' };

const circle: Circle = {
  id: 'showcase',
  personName: 'Rose',
  careFor: ['dementia'],
  ageBand: 'pension-age',
  region: 'england',
  createdAt: at(-70),
  createdBy: 'device',
};
const carer: Carer = {
  uid: 'device',
  name: 'Sam',
  levelWords: ['Fine', 'Managing', 'Stretched', 'Not coping'],
  whatHelpsMe: ['A walk on my own', 'Ringing my brother'],
  helperOn: false,
};

const entry = (days: number, h: number, fields: Partial<Entry> & Pick<Entry, 'kind' | 'title' | 'what'>): Entry => ({
  id: id(),
  at: at(days, h),
  writtenAt: at(days, h, 30),
  ...ME,
  ...fields,
});
const entries: Entry[] = [
  entry(0, 7, {
    kind: 'happened',
    title: 'Upset getting dressed',
    before: 'Woke early. The heating had not come on yet.',
    what: 'Pushed my hand away when I helped with her cardigan and said she could do it. Took twenty minutes.',
    after: 'Settled once she had her tea in the green mug and the radio on.',
    minutes: 20,
    needs: ['temperature', 'control'],
    areas: ['washing', 'distress'],
  }),
  entry(-1, 3, { kind: 'night', title: 'Up three times', what: 'Up at 1, 3 and 5, looking for the bathroom. Back to sleep each time with the landing light on.', wakings: 3, areas: ['night', 'toilet'] }),
  entry(-1, 14, { kind: 'care-given', title: 'Help with lunch', what: 'Cut up her food and reminded her to drink. About forty minutes.', helpType: 'meals', minutes: 40, areas: ['eating'] }),
  entry(-2, 11, { kind: 'contact', title: 'Call with the memory clinic', what: 'Rang about the next review.', service: 'Memory clinic', agreed: 'Letter with a date coming in the next fortnight.', reference: 'MC-20418' }),
  entry(-3, 16, {
    kind: 'happened',
    title: 'Wanted to go home',
    before: 'Late afternoon, getting dark.',
    what: 'Put her coat on and said she needed to get home to her mother.',
    after: 'We looked at the photo album together and she sat down again.',
    minutes: 30,
    needs: ['scared', 'tired'],
    areas: ['memory', 'safety'],
    flagged: true,
  }),
  entry(-4, 2, { kind: 'night', title: 'Up twice', what: 'Up at 2 and 4. Settled quickly.', wakings: 2, areas: ['night'] }),
  entry(-5, 10, { kind: 'health', title: 'Not drinking much', what: 'Only two cups all morning. Offered squash, which she took.', areas: ['eating'] }),
  entry(-6, 9, { kind: 'note', title: 'A good morning', what: 'Sang along to the radio and helped fold the washing.' }),
];

const donepezil: Medicine = {
  id: 'med-donepezil',
  name: 'Donepezil 5 mg tablets',
  label: 'Take ONE tablet at night.',
  times: ['21:00'],
  asNeeded: false,
  addedAt: at(-60),
};
const paracetamol: Medicine = {
  id: 'med-paracetamol',
  name: 'Paracetamol 500 mg tablets',
  label: 'Take TWO tablets up to four times a day when needed. Leave at least 4 hours between doses. No more than 8 tablets in 24 hours.',
  times: [],
  asNeeded: true,
  minGapHours: 4,
  maxPer24h: 4,
  givenFor: 'Pain in her knee',
  addedAt: at(-60),
};
const medicines = [donepezil, paracetamol];
const doses: Dose[] = [];
for (let d = -6; d <= -1; d++) doses.push({ id: id(), medicineId: donepezil.id, at: at(d, 21, 5), outcome: 'given', by: 'device', byName: 'Sam' });
doses.push({ id: id(), medicineId: paracetamol.id, at: at(-1, 15), outcome: 'given', reason: 'Rubbing her knee after the walk', helped: 'yes', by: 'device', byName: 'Sam' });

const contacts: Contact[] = [
  { id: id(), name: 'Dr Patel', role: 'GP', phone: '01632 960 118' },
  { id: id(), name: 'Memory clinic', role: 'Clinic', phone: '01632 960 254', notes: 'Ask for the team secretary.' },
  { id: id(), name: 'Tom', role: 'Son', phone: '07700 900 412' },
];

const appointment: Appointment = {
  id: 'appt-review',
  with: 'Memory clinic',
  when: `${ymd(8)}T10:30`,
  where: 'Outpatients, ground floor',
  theirWords: 'I want to know why I keep losing my glasses.',
  noticed: 'More muddled late in the afternoon. Up most nights this month.',
  questions: [
    { id: id(), text: 'Could the nights be linked to her tablets?' },
    { id: id(), text: 'Is there help for the evenings?' },
  ],
  next: [],
  createdBy: 'device',
  updatedAt: at(-1, 20),
};

const tasks: Task[] = [
  { id: id(), title: 'Pick up the prescription', due: ymd(1), done: false, createdBy: 'device' },
  { id: id(), title: 'Ring about the Attendance Allowance form', due: ymd(4), done: false, createdBy: 'device' },
];

const about: About = {
  sections: {
    'known-as': 'Rose. She likes Rosie from family.',
    communication: 'Short sentences, one thing at a time. Give her time to answer.',
    distress: 'Goes quiet, then wants to leave. Being cold or rushed sets it off. Tea and music help.',
    routine: 'Radio 2 in the morning, a walk to the shop, a sleep after lunch.',
  },
  helps: [
    { code: 'tea', text: 'Tea in the green mug', count: 6 },
    { code: 'radio', text: 'The radio on', count: 4 },
    { code: 'album', text: 'Looking at the photo album', count: 3 },
  ],
  worse: [
    { code: 'rushed', text: 'Being rushed' },
    { code: 'cold', text: 'A cold room' },
  ],
  updatedAt: at(-3),
};

const P = 'whole-story:device';
const store: Record<string, unknown> = {
  [`${P}:circle`]: circle,
  [`${P}:carer`]: carer,
  [`${P}:entries`]: entries,
  [`${P}:doses`]: doses,
  [`${P}:medicines`]: medicines,
  [`${P}:contacts`]: contacts,
  [`${P}:appointments`]: [appointment],
  [`${P}:tasks`]: tasks,
  [`${P}:checkins`]: [],
  [`${P}:doc:about`]: about,
};
console.log(JSON.stringify({ now: NOW, store, ids: { entry: entries[0]?.id ?? '', appointment: appointment.id } }));
