import { AREA_BY_CODE } from '../content/areas';
import { ABOUT_GROUPS, ABOUT_SECTIONS, NEED_BY_CODE } from '../content/care';
import { caringHours, gaps, groupEvidence, helpTypeName, type Form } from '../logic/evidence';
import { findPatterns } from '../logic/patterns';
import { prnHelped } from '../logic/prn';
import { formatDate, formatDateTime, gpSummary, inPeriod } from '../logic/summaries';
import type { About, Circle, Contact, CrisisPlan, Dose, Entry, Medicine, Paper } from '../model/types';
import type { Doc, DocSection } from './pdf';

/**
 * The documents a carer can make from what they have written. Every line comes from their own
 * notes; nothing is added, scored or judged. Wording of headings is our own.
 */

export type DocKind = 'about-me' | 'hospital' | 'gp' | 'respite' | 'care-home' | 'chc' | 'benefits' | 'what-im-seeing' | 'crisis';

export interface DocInfo {
  kind: DocKind;
  name: string;
  what: string;
  /** Needs a period of notes. */
  period: boolean;
}

export const DOCS: DocInfo[] = [
  { kind: 'about-me', name: 'About them', what: 'Who they are, what matters, how to help. For anyone new who will care for them.', period: false },
  { kind: 'hospital', name: 'Hospital passport', what: 'The things ward staff must know, on as few pages as possible. Take it with you.', period: false },
  { kind: 'gp', name: 'Summary for the GP', what: 'What you have seen over a period, in numbers and your words. For an appointment or a review.', period: true },
  { kind: 'respite', name: 'Respite handover', what: 'Everything a respite service needs for a short stay: routine, medicines, what helps, who to call.', period: true },
  { kind: 'care-home', name: 'Moving into a care home', what: 'Their story, their day and their wishes, for the staff who will get to know them.', period: false },
  { kind: 'chc', name: 'Continuing healthcare evidence', what: 'Your examples under the 12 areas the NHS assessment looks at, with your own views. For England.', period: true },
  { kind: 'benefits', name: 'Benefit form evidence', what: 'Your examples under the headings of the form for their age, and your caring hours.', period: true },
  { kind: 'what-im-seeing', name: 'What I am seeing at home', what: 'For a school, an EHCP review or a referral: what happens, when, and what helps.', period: true },
  { kind: 'crisis', name: 'Crisis plan', what: 'Early signs, what helps, what does not, who to call and their wishes.', period: false },
];

export interface PaperInput {
  circle: Circle;
  carerName: string;
  entries: Entry[];
  doses: Dose[];
  medicines: Medicine[];
  contacts: Contact[];
  papers: Paper[];
  about: About | undefined;
  crisis: CrisisPlan | undefined;
  from: number;
  to: number;
  /** For CHC: the carer's own views on their needs, written in the app before making the pack. */
  views?: string;
}

function footer(i: PaperInput): string {
  return `Written by ${i.carerName || 'the family'} about ${i.circle.personName}. Made ${formatDate(Date.now())}.`;
}

function section(about: About | undefined, key: string): string {
  return about?.sections[key]?.trim() ?? '';
}

function aboutSections(about: About | undefined, groups: (keyof typeof ABOUT_GROUPS)[]): DocSection[] {
  return groups.flatMap((g) => {
    const pairs = ABOUT_SECTIONS.filter((s) => s.group === g && section(about, s.key)).map(
      (s) => [s.title, section(about, s.key)] as [string, string],
    );
    return pairs.length ? [{ heading: ABOUT_GROUPS[g], pairs }] : [];
  });
}

function helpsSection(i: PaperInput): DocSection[] {
  const out: DocSection[] = [];
  const helps = [...(i.about?.helps ?? [])].sort((a, b) => b.count - a.count);
  if (helps.length) out.push({ heading: 'What helps', items: helps.map((h) => (h.count > 1 ? `${h.text} (helped ${h.count} times)` : h.text)) });
  if (i.about?.worse.length) out.push({ heading: 'What makes things worse', items: i.about.worse.map((w) => w.text) });
  return out;
}

function medicinesSection(i: PaperInput, withTimes: boolean): DocSection[] {
  const current = i.medicines.filter((m) => !m.stopped);
  if (!current.length) return [];
  return [
    {
      heading: 'Medicines',
      paragraphs: ['As written on the pharmacy labels. Check against the current labels and prescription.'],
      items: current.map((m) => {
        const parts = [m.name, m.label];
        if (withTimes && m.times.length) parts.push(`Usually at ${m.times.join(', ')}`);
        if (m.asNeeded && m.givenFor) parts.push(`As needed, for ${m.givenFor}`);
        if (m.asNeeded) {
          const h = prnHelped(m.id, i.doses);
          const total = h.yes + h.aLittle + h.no;
          if (total) parts.push(`Helped ${h.yes} of ${total} times it was given and asked about`);
        }
        return parts.filter(Boolean).join('. ');
      }),
    },
  ];
}

function contactsSection(i: PaperInput): DocSection[] {
  if (!i.contacts.length) return [];
  return [
    {
      heading: 'Who to contact',
      pairs: i.contacts.map((c) => [`${c.name}${c.role ? `, ${c.role}` : ''}`, [c.phone, c.email, c.notes].filter(Boolean).join('. ')]),
    },
  ];
}

function crisisSections(c: CrisisPlan | undefined): DocSection[] {
  if (!c) return [];
  const out: DocSection[] = [];
  if (c.earlySigns.length) out.push({ heading: 'Early signs', items: c.earlySigns });
  if (c.whatHelps) out.push({ heading: 'What helps when things start to slip', paragraphs: [c.whatHelps] });
  if (c.whatDoesNotHelp) out.push({ heading: 'What does not help', paragraphs: [c.whatDoesNotHelp] });
  if (c.whoToCall) out.push({ heading: 'Who to call', paragraphs: [c.whoToCall] });
  if (c.theirWishes) out.push({ heading: 'Their wishes', paragraphs: [c.theirWishes] });
  out.push({
    heading: 'About this plan',
    paragraphs: [c.writtenWith === 'together' ? 'Written together with them, when they were well.' : 'Written by the family.'],
  });
  return out;
}

function entryLine(e: Entry): string {
  const late = e.writtenAt - e.at > 24 * 60 * 60 * 1000 ? ` (written ${formatDate(e.writtenAt)})` : '';
  const bits = [`${formatDateTime(e.at)}${late}: ${e.title}.`];
  if (e.before) bits.push(`Before: ${e.before}.`);
  if (e.what) bits.push(e.what);
  if (e.after) bits.push(`After: ${e.after}.`);
  if (e.minutes) bits.push(`About ${e.minutes} minutes.`);
  if (e.kind === 'night' && e.wakings) bits.push(`Woke ${e.wakings} times.`);
  return bits.join(' ').replace(/\.\./g, '.');
}

function period(i: PaperInput): string {
  return `${formatDate(i.from)} to ${formatDate(i.to)}`;
}

export function formFor(circle: Circle): Form {
  if (circle.ageBand === 'child') return 'dla';
  if (circle.ageBand === 'pension-age') return 'aa';
  return 'pip';
}

const FORM_NAMES: Record<Form, string> = {
  chc: 'NHS continuing healthcare',
  pip: 'Personal Independence Payment or Adult Disability Payment',
  aa: 'Attendance Allowance or Pension Age Disability Payment',
  dla: 'Disability Living Allowance or Child Disability Payment',
};

function evidenceSections(i: PaperInput, form: Form): DocSection[] {
  return groupEvidence(i.entries, form, i.from, i.to).map((g) => {
    if (!g.entries.length) return { heading: g.heading, paragraphs: ['No notes under this heading in this period.'] };
    const summary = `${g.entries.length} ${g.entries.length === 1 ? 'note' : 'notes'} on ${g.days} ${g.days === 1 ? 'day' : 'days'}${g.atNight ? `, ${g.atNight} at night (10pm to 7am)` : ''}.`;
    return { heading: g.heading, paragraphs: [summary], items: g.entries.slice(-12).map(entryLine) };
  });
}

function hoursSections(i: PaperInput): DocSection[] {
  const h = caringHours(i.entries, i.from, i.to);
  if (!h.weeks.length) return [];
  return [
    {
      heading: 'Caring hours written down',
      paragraphs: [
        `On average ${Math.round(h.averagePerWeek / 60)} hours a week over ${h.weeks.length} ${h.weeks.length === 1 ? 'week' : 'weeks'}. ${h.weeksOver35} ${h.weeksOver35 === 1 ? 'week was' : 'weeks were'} 35 hours or more.`,
        'These are only the times written down; the real total is usually higher.',
      ],
      items: h.weeks.map(
        (w) =>
          `Week starting ${formatDate(w.start)}: ${Math.round(w.minutes / 6) / 10} hours. ` +
          Object.entries(w.byType)
            .map(([t, m]) => `${helpTypeName(t)} ${Math.round(m / 6) / 10}h`)
            .join(', '),
      ),
    },
  ];
}

export function buildDoc(kind: DocKind, i: PaperInput): Doc {
  const name = i.circle.personName;
  const base = { footer: footer(i), author: i.carerName || 'Family carer' };
  switch (kind) {
    case 'about-me':
      return {
        ...base,
        title: `About ${name}`,
        subtitle: `Written by ${i.carerName || 'their family'}, who knows them best`,
        intro: 'Please read this before helping. It tells you who they are and how they like things done.',
        sections: [...aboutSections(i.about, ['must', 'helps', 'matters']), ...helpsSection(i), ...contactsSection(i)],
      };
    case 'hospital': {
      const must = aboutSections(i.about, ['must']);
      const quick = ['eating', 'toilet', 'sleep', 'medicines', 'moving', 'senses'].flatMap((k) => {
        const s = ABOUT_SECTIONS.find((x) => x.key === k);
        return s && section(i.about, s.key) ? [[s.title, section(i.about, s.key)] as [string, string]] : [];
      });
      return {
        ...base,
        title: `Hospital passport: ${name}`,
        subtitle: 'Please keep this with them and read it at each handover',
        sections: [
          ...must,
          ...(quick.length ? [{ heading: 'Day-to-day care', pairs: quick }] : []),
          ...helpsSection(i),
          ...medicinesSection(i, true),
          ...contactsSection(i),
        ],
      };
    }
    case 'gp':
      return {
        ...base,
        title: `${name}: what the family has seen`,
        subtitle: period(i),
        sections: gpSummary(name, i.entries, i.doses, i.medicines, i.from, i.to).map((s) => ({ heading: s.heading, items: s.lines })),
      };
    case 'respite': {
      const recent = inPeriod(i.entries, i.from, i.to)
        .filter((e) => e.kind === 'happened' || e.kind === 'health' || e.kind === 'night')
        .sort((a, b) => b.at - a.at)
        .slice(0, 10);
      return {
        ...base,
        title: `Handover for ${name}'s stay`,
        subtitle: `From ${i.carerName || 'the family'}`,
        intro: 'Everything you need for a short stay. The family is happy to be called with any question.',
        sections: [
          ...aboutSections(i.about, ['must', 'helps']),
          ...(section(i.about, 'routine') ? [{ heading: 'A usual day', paragraphs: [section(i.about, 'routine')] }] : []),
          ...helpsSection(i),
          ...medicinesSection(i, true),
          ...crisisSections(i.crisis).slice(0, 3),
          ...(recent.length ? [{ heading: 'Recently', items: recent.map(entryLine) }] : []),
          ...contactsSection(i),
        ],
      };
    }
    case 'care-home': {
      const wherePapers = i.papers.length
        ? [{ heading: 'Important papers', pairs: i.papers.map((p) => [p.title, [p.whereKept, p.reference].filter(Boolean).join('. ')] as [string, string]) }]
        : [];
      return {
        ...base,
        title: `Getting to know ${name}`,
        subtitle: `From ${i.carerName || 'the family'}`,
        intro: 'This is who they are, in the words of the people who love them. It will help them settle.',
        sections: [
          ...aboutSections(i.about, ['matters', 'must', 'helps']),
          ...helpsSection(i),
          ...crisisSections(i.crisis).filter((s) => s.heading === 'Their wishes'),
          ...medicinesSection(i, true),
          ...wherePapers,
          ...contactsSection(i),
        ],
      };
    }
    case 'chc':
      return {
        ...base,
        title: `${name}: the family's evidence for continuing healthcare`,
        subtitle: period(i),
        intro:
          'The assessment looks at 12 areas of care. Under each one are the family’s own notes, written at the time. ' +
          'The family has not chosen a level in any area; that is for the assessment, and the family asks to be part of that discussion.',
        sections: [
          ...(i.views?.trim() ? [{ heading: 'The family’s views on their needs', paragraphs: [i.views.trim()] }] : []),
          ...evidenceSections(i, 'chc'),
          ...medicinesSection(i, false),
          {
            heading: 'Areas with no notes',
            paragraphs: [gaps(i.entries, i.from, i.to).join(', ') || 'Every area has at least one note.'],
          },
        ],
      };
    case 'benefits': {
      const form = formFor(i.circle);
      return {
        ...base,
        title: `${name}: examples for the ${FORM_NAMES[form]} form`,
        subtitle: period(i),
        intro:
          'Notes written at the time, grouped under the headings of the form. Copy the examples that fit into each question, and say how often it happens and how long it takes.',
        sections: [...evidenceSections(i, form), ...hoursSections(i)],
      };
    }
    case 'what-im-seeing': {
      const happened = inPeriod(i.entries, i.from, i.to).filter((e) => e.kind === 'happened');
      const needs = new Map<string, number>();
      for (const e of happened) for (const n of e.needs ?? []) needs.set(n, (needs.get(n) ?? 0) + 1);
      const areas = new Map<string, number>();
      for (const e of inPeriod(i.entries, i.from, i.to)) for (const a of e.areas ?? []) areas.set(a, (areas.get(a) ?? 0) + 1);
      return {
        ...base,
        title: `What we are seeing at home: ${name}`,
        subtitle: period(i),
        sections: [
          { heading: 'In short', items: [`${happened.length} difficult moments written down in this period.`] },
          ...(areas.size
            ? [{ heading: 'Where they need help', items: [...areas].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${AREA_BY_CODE.get(c)?.name ?? c}: ${n} notes`) }]
            : []),
          ...(needs.size
            ? [{ heading: 'What seemed to be behind it', items: [...needs].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${NEED_BY_CODE.get(c) ?? c}: ${n} times`) }]
            : []),
          ...(findPatterns(i.entries, i.doses, i.about).length
            ? [{ heading: 'Patterns', items: findPatterns(inPeriod(i.entries, i.from, i.to), i.doses, i.about).map((p) => p.text) }]
            : []),
          ...helpsSection(i),
          { heading: 'Examples', items: happened.slice(-15).map(entryLine) },
        ],
      };
    }
    case 'crisis':
      return {
        ...base,
        title: `${name}'s crisis plan`,
        subtitle: i.crisis ? `Updated ${formatDate(i.crisis.updatedAt)}` : 'Not written yet',
        sections: [...crisisSections(i.crisis), ...contactsSection(i)],
      };
  }
}
