import type { About, Circle, Dose, Entry, Medicine } from '../lib/model/types';

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
/** Wednesday 14 October 2026, 15:00 local time. */
export const NOW = new Date(2026, 9, 14, 15, 0, 0).getTime();

export const circle: Circle = {
  id: 'c1',
  personName: 'Mum',
  careFor: ['dementia'],
  ageBand: 'pension-age',
  region: 'england',
  createdAt: NOW - 90 * DAY,
  createdBy: 'u1',
};

let n = 0;
export function entry(partial: Partial<Entry> & Pick<Entry, 'kind' | 'at'>): Entry {
  n += 1;
  return {
    id: `e${n}`,
    writtenAt: partial.at,
    author: 'u1',
    authorName: 'Sam',
    title: 'Something happened',
    what: 'She shouted and would not sit down.',
    ...partial,
  };
}

export const prn: Medicine = {
  id: 'm1',
  name: 'Lorazepam',
  label: 'One tablet when needed for agitation. Leave 4 hours between doses. No more than 2 in 24 hours.',
  times: [],
  asNeeded: true,
  minGapHours: 4,
  maxPer24h: 2,
  givenFor: 'agitation',
  addedAt: NOW - 30 * DAY,
};

export const regular: Medicine = {
  id: 'm2',
  name: 'Donepezil',
  label: 'One tablet at night.',
  times: ['21:00'],
  asNeeded: false,
  addedAt: NOW - 30 * DAY,
};

export function dose(partial: Partial<Dose> & Pick<Dose, 'medicineId' | 'at'>): Dose {
  n += 1;
  return { id: `d${n}`, outcome: 'given', by: 'u1', byName: 'Sam', ...partial };
}

export const about: About = {
  sections: {
    'known-as': 'Margaret, but she likes Peggy.',
    communication: 'Short sentences, one thing at a time.',
    distress: 'Wrings her hands and asks for her mother.',
    life: 'Grew up in St Peter Port. Worked as a nurse in the 1970s.',
    routine: 'Tea at seven, a walk after lunch.',
  },
  helps: [
    { code: 'h1', text: 'Her music', count: 4 },
    { code: 'h2', text: 'A cup of tea together', count: 1 },
  ],
  worse: [{ code: 'w1', text: 'Being rushed' }],
  updatedAt: NOW - DAY,
};
