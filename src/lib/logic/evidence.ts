import { AREAS, AREA_BY_CODE, CHC_DOMAINS, HELP_TYPES, PIP_ACTIVITIES } from '../content/areas';
import type { Entry } from '../model/types';

/**
 * Groups a carer's own notes under the headings of the forms they will fill in. The app never
 * chooses a level, points or a score; it puts the carer's examples where an assessor looks.
 */

export interface EvidenceGroup {
  heading: string;
  entries: Entry[];
  /** Days in the period with at least one note under this heading. */
  days: number;
  /** Notes under this heading written between 10pm and 7am. */
  atNight: number;
}

export type Form = 'chc' | 'pip' | 'aa' | 'dla';

const AA_HEADINGS = {
  day: 'Help with personal care during the day',
  night: 'Help during the night',
  watching: 'Someone keeping watch to keep them safe',
} as const;

const DLA_HEADINGS = { care: 'Care: attention and supervision', mobility: 'Mobility: getting about safely' } as const;

export function headingsFor(form: Form): readonly string[] {
  switch (form) {
    case 'chc':
      return CHC_DOMAINS;
    case 'pip':
      return PIP_ACTIVITIES;
    case 'aa':
      return Object.values(AA_HEADINGS);
    case 'dla':
      return Object.values(DLA_HEADINGS);
  }
}

function headingsOfArea(code: string, form: Form): string[] {
  const area = AREA_BY_CODE.get(code);
  if (!area) return [];
  switch (form) {
    case 'chc':
      return area.chc;
    case 'pip':
      return area.pip;
    case 'aa':
      return area.aa.map((k) => AA_HEADINGS[k]);
    case 'dla':
      return area.dla.map((k) => DLA_HEADINGS[k]);
  }
}

export function isNight(at: number): boolean {
  const h = new Date(at).getHours();
  return h >= 22 || h < 7;
}

export function groupEvidence(entries: Entry[], form: Form, from: number, to: number): EvidenceGroup[] {
  const inPeriod = entries.filter((e) => e.at >= from && e.at <= to && e.kind !== 'contact');
  return headingsFor(form).map((heading) => {
    const list = inPeriod
      .filter((e) => {
        const areas = new Set(e.areas ?? []);
        if (e.kind === 'night') areas.add('night');
        return [...areas].some((a) => headingsOfArea(a, form).includes(heading));
      })
      .sort((a, b) => a.at - b.at);
    return {
      heading,
      entries: list,
      days: new Set(list.map((e) => new Date(e.at).toDateString())).size,
      atNight: list.filter((e) => isNight(e.at)).length,
    };
  });
}

export interface HoursSummary {
  weeks: { start: number; minutes: number; byType: Record<string, number> }[];
  averagePerWeek: number;
  /** Weeks in the period at or over 35 hours, the Carer's Allowance line in the UK and Guernsey. */
  weeksOver35: number;
}

/** Caring time from 'care-given' notes, by week starting Monday. */
export function caringHours(entries: Entry[], from: number, to: number): HoursSummary {
  const given = entries.filter((e) => e.kind === 'care-given' && e.at >= from && e.at <= to && (e.minutes ?? 0) > 0);
  const weeks = new Map<number, { minutes: number; byType: Record<string, number> }>();
  for (const e of given) {
    const start = mondayOf(e.at);
    const w = weeks.get(start) ?? { minutes: 0, byType: {} };
    w.minutes += e.minutes ?? 0;
    const type = e.helpType ?? 'other';
    w.byType[type] = (w.byType[type] ?? 0) + (e.minutes ?? 0);
    weeks.set(start, w);
  }
  const list = [...weeks].sort((a, b) => a[0] - b[0]).map(([start, w]) => ({ start, ...w }));
  const total = list.reduce((s, w) => s + w.minutes, 0);
  return {
    weeks: list,
    averagePerWeek: list.length ? Math.round(total / list.length) : 0,
    weeksOver35: list.filter((w) => w.minutes >= 35 * 60).length,
  };
}

export function mondayOf(at: number): number {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.getTime();
}

export function helpTypeName(code: string): string {
  return HELP_TYPES.find((h) => h.code === code)?.name ?? 'Other help';
}

/** Areas with no notes in the period, so the carer can see what is missing before an assessment. */
export function gaps(entries: Entry[], from: number, to: number): string[] {
  const seen = new Set(entries.filter((e) => e.at >= from && e.at <= to).flatMap((e) => e.areas ?? []));
  return AREAS.filter((a) => !seen.has(a.code)).map((a) => a.name);
}
