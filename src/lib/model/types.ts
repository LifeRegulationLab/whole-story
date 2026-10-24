/**
 * Everything Whole Story keeps. It is written by a family carer about someone they love, so every
 * field is in their words. Nothing here scores, stages or diagnoses the person.
 */

/** Who the person is caring for, in broad terms. Changes the wording, examples and documents offered. */
export type CareFor = 'dementia' | 'learning-disability' | 'autism' | 'mental-health' | 'physical' | 'other';

/** A circle is one cared-for person and the people who help with their care. */
export interface Circle {
  id: string;
  /** What the carer calls the person: first name or nickname only. */
  personName: string;
  careFor: CareFor[];
  /** The person's age band, which decides which benefit pages are offered. */
  ageBand: 'child' | 'adult' | 'pension-age';
  /** Where they live, which decides helplines, benefits and local help. */
  region: Region;
  createdAt: number;
  createdBy: string;
}

export type Region = 'england' | 'scotland' | 'wales' | 'northern-ireland' | 'guernsey' | 'jersey' | 'isle-of-man';

export type Role = 'lead' | 'family' | 'viewer';

export interface Member {
  uid: string;
  name: string;
  role: Role;
  /** What a family member or viewer may see. The lead carer sees everything. */
  sees: { log: boolean; medicines: boolean; about: boolean; papers: boolean };
  joinedAt: number;
}

/** The kinds of things a carer logs. */
export type EntryKind =
  | 'happened' // something happened: before, what they did, after
  | 'night' // a disturbed night
  | 'note' // anything else worth remembering
  | 'health' // a fall, an infection, a change in eating, drinking, toilet, skin
  | 'care-given' // help the carer gave, for the hours and help evidence
  | 'contact' // a call, meeting or appointment with a service
  | 'sign'; // an early sign from the crisis plan

export interface Entry {
  id: string;
  kind: EntryKind;
  /** When it happened, as the carer says. */
  at: number;
  /** When it was written. Shown when it is more than a day after `at`, so nothing looks back-dated. */
  writtenAt: number;
  author: string;
  authorName: string;
  /** Short words for the timeline. */
  title: string;
  /** What was going on before. */
  before?: string;
  /** What happened, in plain words: what was seen and heard. */
  what: string;
  /** What happened next, and what helped. */
  after?: string;
  where?: string;
  who?: string;
  /** Minutes it went on for, if known. */
  minutes?: number;
  /** Codes from NEEDS: what might have been wrong for them. */
  needs?: string[];
  /** Codes from HELPS chosen on their card. */
  helped?: string[];
  /** Codes from AREAS: the parts of life this shows help is needed with. Used for the evidence packs. */
  areas?: string[];
  /** For 'care-given': the help given, by code from HELP_TYPES, and how long. */
  helpType?: string;
  /** For 'contact': who the service was, and what was agreed. */
  service?: string;
  agreed?: string;
  reference?: string;
  /** For 'night': times woken. */
  wakings?: number;
  /** A carer can mark an entry as worth showing a professional. */
  flagged?: boolean;
}

/** A medicine as written on the pharmacy label. The app never suggests a dose. */
export interface Medicine {
  id: string;
  name: string;
  /** The label's instructions, copied word for word. */
  label: string;
  what?: string;
  /** Regular times in 24-hour "HH:MM", empty for as-needed only. */
  times: string[];
  asNeeded: boolean;
  /** From the label: the shortest gap between as-needed doses, in hours. */
  minGapHours?: number;
  /** From the label: the most as-needed doses in 24 hours. */
  maxPer24h?: number;
  /** For as-needed: what the prescriber said it is for. */
  givenFor?: string;
  stopped?: boolean;
  addedAt: number;
}

export interface Dose {
  id: string;
  medicineId: string;
  at: number;
  /** For regular doses: given, refused, missed. As-needed doses are always 'given'. */
  outcome: 'given' | 'refused' | 'missed';
  /** For as-needed: why it was given. */
  reason?: string;
  /** Filled in later: did it help. */
  helped?: 'yes' | 'a-little' | 'no';
  /** True if a warning was shown and the carer chose to go ahead. */
  warnedAndGiven?: boolean;
  by: string;
  byName: string;
}

/** 'About them': written by the carer, in sections, in their words. */
export interface About {
  /** Free text by section key, from ABOUT_SECTIONS. */
  sections: Record<string, string>;
  /** What helps, each a short line. Tapping one in a log raises its count. */
  helps: { code: string; text: string; count: number }[];
  /** What makes things worse. */
  worse: { code: string; text: string }[];
  updatedAt: number;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  notes?: string;
}

/** A crisis and early-signs plan, best written with the person when they are well. */
export interface CrisisPlan {
  earlySigns: string[];
  whatHelps: string;
  whatDoesNotHelp: string;
  whoToCall: string;
  theirWishes: string;
  /** Who wrote it, and whether the person took part. */
  writtenWith: 'together' | 'carer-only';
  updatedAt: number;
}

/** Where important papers are kept, and a short note on each. Files are not uploaded in this version. */
export interface Paper {
  id: string;
  title: string;
  kind: 'power-of-attorney' | 'care-plan' | 'letter' | 'benefit' | 'medical' | 'money' | 'other';
  whereKept: string;
  reference?: string;
  notes?: string;
  reviewBy?: string;
}

export interface Task {
  id: string;
  title: string;
  due?: string;
  assignedTo?: string;
  assignedName?: string;
  done: boolean;
  createdBy: string;
}

/** A request for someone to cover a slot, so the carer gets a break. */
export interface CoverRequest {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  from: string;
  to: string;
  note?: string;
  takenBy?: string;
  takenName?: string;
  createdBy: string;
}

export interface Message {
  id: string;
  at: number;
  by: string;
  byName: string;
  text: string;
}

/** The carer's own check-in. Private to them, never shown to family. */
export interface CheckIn {
  id: string;
  at: number;
  level: 1 | 2 | 3 | 4;
  note?: string;
}

export interface Carer {
  uid: string;
  name: string;
  /** Their own four words for how they are, chosen at the start. */
  levelWords: [string, string, string, string];
  whatHelpsMe: string[];
  /** One person they could text when it is hard. The app never messages them. */
  someone?: string;
  helperOn: boolean;
}
