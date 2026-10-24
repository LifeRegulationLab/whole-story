import { AREA_BY_CODE } from '../content/areas';
import { NEED_BY_CODE } from '../content/care';
import type { About, Dose, Entry } from '../model/types';

/**
 * Plain patterns from the log, written by fixed rules, never by AI. Each line says how many
 * entries it rests on, and keeps their ids so the reader can open them.
 */

export interface Pattern {
  text: string;
  entryIds: string[];
}

export const BANDS = [
  { key: 'night', name: 'at night (midnight to 6am)', from: 0, to: 6 },
  { key: 'morning', name: 'in the morning (6am to noon)', from: 6, to: 12 },
  { key: 'afternoon', name: 'in the afternoon (noon to 5pm)', from: 12, to: 17 },
  { key: 'evening', name: 'in the evening (5pm to 9pm)', from: 17, to: 21 },
  { key: 'late', name: 'late in the evening (9pm to midnight)', from: 21, to: 24 },
] as const;

export function bandOf(at: number): (typeof BANDS)[number] {
  const h = new Date(at).getHours();
  return BANDS.find((b) => h >= b.from && h < b.to) ?? BANDS[0];
}

const DAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

/** At least this many entries before a pattern is mentioned, so one bad day does not become a pattern. */
const MIN = 3;

export function findPatterns(entries: Entry[], doses: Dose[], about: About | undefined): Pattern[] {
  const out: Pattern[] = [];
  const happened = entries.filter((e) => e.kind === 'happened');
  if (happened.length < MIN) return out;

  // Time of day
  const byBand = groupBy(happened, (e) => bandOf(e.at).key);
  const topBand = largest(byBand);
  if (topBand && topBand[1].length >= MIN && topBand[1].length / happened.length >= 0.4) {
    const band = BANDS.find((b) => b.key === topBand[0]);
    out.push({
      text: `${topBand[1].length} of ${happened.length} times something happened, it was ${band?.name ?? 'at the same time of day'}.`,
      entryIds: topBand[1].map((e) => e.id),
    });
  }

  // Day of week
  const byDay = groupBy(happened, (e) => String(new Date(e.at).getDay()));
  const topDay = largest(byDay);
  if (topDay && topDay[1].length >= MIN && topDay[1].length / happened.length >= 0.35) {
    out.push({
      text: `${topDay[1].length} of ${happened.length} were on ${DAYS[Number(topDay[0])] ?? 'the same day'}. Is anything different on that day?`,
      entryIds: topDay[1].map((e) => e.id),
    });
  }

  // Needs ticked
  const needCounts = new Map<string, Entry[]>();
  for (const e of happened) for (const n of e.needs ?? []) needCounts.set(n, [...(needCounts.get(n) ?? []), e]);
  for (const [code, list] of [...needCounts].sort((a, b) => b[1].length - a[1].length).slice(0, 2)) {
    if (list.length < MIN) continue;
    out.push({
      text: `"${NEED_BY_CODE.get(code) ?? code}" was ticked ${list.length} times.`,
      entryIds: list.map((e) => e.id),
    });
  }

  // Around as-needed medicine
  const prnTimes = doses.filter((d) => d.outcome === 'given' && d.reason !== undefined).map((d) => d.at);
  if (prnTimes.length > 0) {
    const near = happened.filter((e) => prnTimes.some((t) => Math.abs(e.at - t) <= 90 * 60 * 1000));
    if (near.length >= MIN) {
      out.push({
        text: `${near.length} happened within an hour and a half of an as-needed medicine. Worth mentioning to whoever prescribes it.`,
        entryIds: near.map((e) => e.id),
      });
    }
  }

  // Areas
  const areaCounts = new Map<string, Entry[]>();
  for (const e of entries) for (const a of e.areas ?? []) areaCounts.set(a, [...(areaCounts.get(a) ?? []), e]);
  const topArea = [...areaCounts].sort((a, b) => b[1].length - a[1].length)[0];
  if (topArea && topArea[1].length >= MIN) {
    out.push({
      text: `Most of your notes are about ${AREA_BY_CODE.get(topArea[0])?.name.toLowerCase() ?? topArea[0]} (${topArea[1].length}).`,
      entryIds: topArea[1].map((e) => e.id),
    });
  }

  // What helped
  if (about) {
    const best = about.helps.filter((h) => h.count >= MIN).sort((a, b) => b.count - a.count)[0];
    if (best) {
      const ids = happened.filter((e) => e.helped?.includes(best.code)).map((e) => e.id);
      out.push({ text: `"${best.text}" has helped ${best.count} times. It is now first on their list.`, entryIds: ids });
    }
  }

  return out;
}

/** Disturbed nights per week over the last four weeks, oldest first. */
export function nightsPerWeek(entries: Entry[], now: number): number[] {
  const week = 7 * 24 * 60 * 60 * 1000;
  return [3, 2, 1, 0].map((ago) => {
    const end = now - ago * week;
    const start = end - week;
    const days = new Set(
      entries.filter((e) => e.kind === 'night' && e.at >= start && e.at < end).map((e) => new Date(e.at).toDateString()),
    );
    return days.size;
  });
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
}

function largest<T>(map: Map<string, T[]>): [string, T[]] | undefined {
  return [...map].sort((a, b) => b[1].length - a[1].length)[0];
}
