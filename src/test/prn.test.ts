import { describe, expect, it } from 'vitest';
import { checkPrn, dueToday, prnHelped } from '../lib/logic/prn';
import { dose, HOUR, NOW, prn, regular } from './fixtures';

describe('as-needed checks', () => {
  it('has no warnings for a first dose', () => {
    const c = checkPrn(prn, [], NOW);
    expect(c.warnings).toEqual([]);
    expect(c.inLast24h).toBe(0);
  });

  it('warns when the label gap has not passed, and says to ask a pharmacist', () => {
    const c = checkPrn(prn, [dose({ medicineId: 'm1', at: NOW - 2 * HOUR })], NOW);
    expect(c.warnings[0]).toContain('4 hours');
    expect(c.warnings.at(-1)).toContain('pharmacist');
    expect(c.hoursSinceLast).toBe(2);
  });

  it('warns at the daily limit and ignores refused or other medicines', () => {
    const doses = [
      dose({ medicineId: 'm1', at: NOW - 10 * HOUR }),
      dose({ medicineId: 'm1', at: NOW - 5 * HOUR }),
      dose({ medicineId: 'm1', at: NOW - 1 * HOUR, outcome: 'refused' }),
      dose({ medicineId: 'm2', at: NOW - 1 * HOUR }),
    ];
    const c = checkPrn(prn, doses, NOW);
    expect(c.inLast24h).toBe(2);
    expect(c.warnings.some((w) => w.includes('no more than 2'))).toBe(true);
  });

  it('never says a dose amount of its own', () => {
    const c = checkPrn(prn, [dose({ medicineId: 'm1', at: NOW - HOUR })], NOW);
    for (const w of c.warnings) expect(w).not.toMatch(/\d+\s?(mg|ml|mcg)/i);
  });

  it('lists regular doses not yet recorded today', () => {
    expect(dueToday([regular], [], new Date(NOW)).map((d) => d.time)).toEqual(['21:00']);
    expect(dueToday([regular], [dose({ medicineId: 'm2', at: NOW - HOUR })], new Date(NOW))).toEqual([]);
    expect(dueToday([{ ...regular, stopped: true }], [], new Date(NOW))).toEqual([]);
  });

  it('counts whether it helped', () => {
    const h = prnHelped('m1', [
      dose({ medicineId: 'm1', at: NOW, helped: 'yes' }),
      dose({ medicineId: 'm1', at: NOW, helped: 'no' }),
      dose({ medicineId: 'm1', at: NOW }),
    ]);
    expect(h).toEqual({ yes: 1, aLittle: 0, no: 1, unknown: 1 });
  });
});
