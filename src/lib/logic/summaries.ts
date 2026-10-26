import { NEED_BY_CODE } from '../content/care';
import type { CheckIn, Dose, Entry, Medicine } from '../model/types';
import { bandOf, nightsPerWeek } from './patterns';
import { possessive } from '../model/name';

/**
 * Plain-language summaries built by fixed rules from the log. The same sections in the same order
 * every time, so a GP, a sibling or a care home learns where to look.
 */

const DAY = 24 * 60 * 60 * 1000;

export function inPeriod<T extends { at: number }>(items: T[], from: number, to: number): T[] {
  return items.filter((i) => i.at >= from && i.at <= to);
}

export function formatDate(at: number): string {
  return new Date(at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTime(at: number): string {
  return new Date(at).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface Summary {
  heading: string;
  lines: string[];
}

/** The sections of the GP summary. */
export function gpSummary(
  personName: string,
  entries: Entry[],
  doses: Dose[],
  medicines: Medicine[],
  from: number,
  to: number,
): Summary[] {
  const e = inPeriod(entries, from, to);
  const happened = e.filter((x) => x.kind === 'happened');
  const nights = e.filter((x) => x.kind === 'night');
  const health = e.filter((x) => x.kind === 'health');
  const days = Math.max(1, Math.round((to - from) / DAY));
  const out: Summary[] = [];

  out.push({
    heading: 'In short',
    lines: [
      `This covers ${days} days, ${formatDate(from)} to ${formatDate(to)}, written by the family as things happened.`,
      `${happened.length} times something difficult happened, ${nights.length} disturbed nights, ${health.length} health notes.`,
    ],
  });

  if (happened.length > 0) {
    const bands = new Map<string, number>();
    for (const x of happened) bands.set(bandOf(x.at).name, (bands.get(bandOf(x.at).name) ?? 0) + 1);
    const needs = new Map<string, number>();
    for (const x of happened) for (const n of x.needs ?? []) needs.set(n, (needs.get(n) ?? 0) + 1);
    const lines = [...bands].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${name}.`);
    const topNeeds = [...needs].sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (topNeeds.length) {
      lines.push(`What the family thought might be wrong: ${topNeeds.map(([c, n]) => `${(NEED_BY_CODE.get(c) ?? c).toLowerCase()} (${n})`).join(', ')}.`);
    }
    out.push({ heading: 'When things were difficult', lines });
  }

  if (nights.length > 0) {
    const wakings = nights.reduce((s, x) => s + (x.wakings ?? 0), 0);
    out.push({
      heading: 'Nights',
      lines: [
        `${nights.length} disturbed nights${wakings ? `, woken ${wakings} times in all` : ''}.`,
        `Disturbed nights in each of the last four weeks: ${nightsPerWeek(entries, to).join(', ')}.`,
      ],
    });
  }

  if (health.length > 0) {
    out.push({ heading: 'Health changes noticed', lines: health.map((x) => `${formatDateTime(x.at)}: ${x.title}. ${x.what}`) });
  }

  const prn = medicines.filter((m) => m.asNeeded);
  if (prn.length > 0) {
    const lines = prn.map((m) => {
      const given = inPeriod(doses, from, to).filter((d) => d.medicineId === m.id && d.outcome === 'given');
      const helped = given.filter((d) => d.helped === 'yes').length;
      const little = given.filter((d) => d.helped === 'a-little').length;
      const no = given.filter((d) => d.helped === 'no').length;
      return `${m.name}: given ${given.length} times. Helped ${helped}, helped a little ${little}, did not help ${no}.`;
    });
    out.push({ heading: 'As-needed medicines', lines });
  }

  const refused = inPeriod(doses, from, to).filter((d) => d.outcome !== 'given');
  if (refused.length > 0) {
    out.push({
      heading: 'Regular medicines not taken',
      lines: [`${refused.filter((d) => d.outcome === 'refused').length} refused, ${refused.filter((d) => d.outcome === 'missed').length} missed.`],
    });
  }

  const flagged = e.filter((x) => x.flagged);
  if (flagged.length > 0) {
    out.push({ heading: 'Marked by the family as important', lines: flagged.map((x) => `${formatDateTime(x.at)}: ${x.title}. ${x.what}`) });
  }

  out.push({
    heading: 'About these notes',
    lines: [
      `Written by ${possessive(personName)} family. They describe what was seen and heard; they are not a medical assessment.`,
    ],
  });
  return out;
}

/** A short weekly update the lead carer can send to family, in their own voice. */
export function weeklyUpdate(personName: string, entries: Entry[], doses: Dose[], checkIns: CheckIn[], now: number): string {
  const from = now - 7 * DAY;
  const e = inPeriod(entries, from, now);
  const happened = e.filter((x) => x.kind === 'happened').length;
  const nights = e.filter((x) => x.kind === 'night').length;
  const health = e.filter((x) => x.kind === 'health');
  const contacts = e.filter((x) => x.kind === 'contact');
  const care = e.filter((x) => x.kind === 'care-given').reduce((s, x) => s + (x.minutes ?? 0), 0);
  const prnGiven = inPeriod(doses, from, now).filter((d) => d.reason !== undefined && d.outcome === 'given').length;
  const lastLevel = checkIns.filter((c) => c.at >= from).sort((a, b) => b.at - a.at)[0];

  const parts = [`This week with ${personName}:`];
  parts.push(happened === 0 ? '- No difficult moments written down.' : `- ${happened} difficult ${happened === 1 ? 'moment' : 'moments'}.`);
  parts.push(nights === 0 ? '- Nights were settled.' : `- ${nights} disturbed ${nights === 1 ? 'night' : 'nights'}.`);
  if (prnGiven) parts.push(`- As-needed medicine given ${prnGiven} ${prnGiven === 1 ? 'time' : 'times'}.`);
  for (const h of health) parts.push(`- ${h.title}.`);
  for (const c of contacts) parts.push(`- Spoke to ${c.service ?? 'a service'}${c.agreed ? `: ${c.agreed}` : ''}.`);
  if (care >= 60) parts.push(`- About ${Math.round(care / 60)} hours of care written down.`);
  if (lastLevel && lastLevel.level >= 3) parts.push('- I am finding it hard at the moment. Some help would make a difference.');
  return parts.join('\n');
}
