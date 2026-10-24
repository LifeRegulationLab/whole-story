import type { Dose, Medicine } from '../model/types';

const HOUR = 60 * 60 * 1000;

export interface PrnCheck {
  /** Doses of this medicine given in the 24 hours before `now`. */
  inLast24h: number;
  /** The most recent dose, if any. */
  last?: Dose;
  /** Hours since the last dose, to one decimal place. */
  hoursSinceLast?: number;
  /** Plain warnings. The carer can still record the dose; the app never blocks or suggests one. */
  warnings: string[];
}

/**
 * Checks an as-needed dose against the gap and daily limit the carer copied from the label.
 * It only compares numbers the carer entered; it does not know anything about the medicine itself.
 */
export function checkPrn(medicine: Medicine, doses: Dose[], now: number): PrnCheck {
  const given = doses
    .filter((d) => d.medicineId === medicine.id && d.outcome === 'given' && d.at <= now)
    .sort((a, b) => b.at - a.at);
  const last = given[0];
  const inLast24h = given.filter((d) => now - d.at < 24 * HOUR).length;
  const warnings: string[] = [];
  let hoursSinceLast: number | undefined;

  if (last) {
    hoursSinceLast = Math.round(((now - last.at) / HOUR) * 10) / 10;
    if (medicine.minGapHours !== undefined && now - last.at < medicine.minGapHours * HOUR) {
      warnings.push(
        `The label says to leave ${hours(medicine.minGapHours)} between doses. The last one was ${hours(hoursSinceLast)} ago.`,
      );
    }
  }
  if (medicine.maxPer24h !== undefined && inLast24h >= medicine.maxPer24h) {
    warnings.push(
      `The label says no more than ${medicine.maxPer24h} in 24 hours. ${inLast24h} ${inLast24h === 1 ? 'has' : 'have'} been given.`,
    );
  }
  if (warnings.length > 0) {
    warnings.push('If you are unsure, ask a pharmacist, their GP or NHS 111 before giving another.');
  }
  return last === undefined
    ? { inLast24h, warnings }
    : hoursSinceLast === undefined
      ? { inLast24h, last, warnings }
      : { inLast24h, last, hoursSinceLast, warnings };
}

function hours(h: number): string {
  if (h < 1) {
    const m = Math.round(h * 60);
    return `${m} minute${m === 1 ? '' : 's'}`;
  }
  const rounded = Math.round(h * 10) / 10;
  return `${rounded} hour${rounded === 1 ? '' : 's'}`;
}

/** Regular doses due today that have no record yet, earliest first. */
export function dueToday(medicines: Medicine[], doses: Dose[], now: Date): { medicine: Medicine; time: string }[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const todays = doses.filter((d) => d.at >= start.getTime());
  const due: { medicine: Medicine; time: string }[] = [];
  for (const m of medicines) {
    if (m.stopped) continue;
    const recorded = todays.filter((d) => d.medicineId === m.id).length;
    m.times
      .slice()
      .sort()
      .forEach((time, i) => {
        if (i >= recorded) due.push({ medicine: m, time });
      });
  }
  return due.sort((a, b) => a.time.localeCompare(b.time));
}

/** How often an as-needed medicine helped, from the carer's own 'did it help' answers. */
export function prnHelped(medicineId: string, doses: Dose[]): { yes: number; aLittle: number; no: number; unknown: number } {
  const out = { yes: 0, aLittle: 0, no: 0, unknown: 0 };
  for (const d of doses) {
    if (d.medicineId !== medicineId || d.outcome !== 'given') continue;
    if (d.helped === 'yes') out.yes += 1;
    else if (d.helped === 'a-little') out.aLittle += 1;
    else if (d.helped === 'no') out.no += 1;
    else out.unknown += 1;
  }
  return out;
}
