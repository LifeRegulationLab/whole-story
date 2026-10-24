import { describe, expect, it } from 'vitest';
import { AREAS, CHC_DOMAINS, PIP_ACTIVITIES } from '../lib/content/areas';
import { caringHours, gaps, groupEvidence, headingsFor, mondayOf } from '../lib/logic/evidence';
import { findPatterns } from '../lib/logic/patterns';
import { DAY, entry, NOW } from './fixtures';

describe('areas', () => {
  it('only point at real form headings', () => {
    for (const a of AREAS) {
      for (const h of a.chc) expect(CHC_DOMAINS).toContain(h);
      for (const h of a.pip) expect(PIP_ACTIVITIES).toContain(h);
    }
  });

  it('cover every CHC domain and PIP activity at least once', () => {
    for (const d of CHC_DOMAINS) expect(AREAS.some((a) => a.chc.includes(d))).toBe(true);
    for (const d of PIP_ACTIVITIES) expect(AREAS.some((a) => a.pip.includes(d))).toBe(true);
  });
});

describe('evidence', () => {
  const entries = [
    entry({ kind: 'happened', at: NOW - 2 * DAY, areas: ['distress'] }),
    entry({ kind: 'happened', at: NOW - 3 * DAY, areas: ['distress', 'safety'] }),
    entry({ kind: 'night', at: new Date(2026, 9, 12, 3).getTime() }),
    entry({ kind: 'contact', at: NOW - DAY, areas: ['distress'] }),
  ];

  it('groups notes under the 12 CHC domains in order and never scores', () => {
    const g = groupEvidence(entries, 'chc', NOW - 30 * DAY, NOW);
    expect(g.map((x) => x.heading)).toEqual([...CHC_DOMAINS]);
    const behaviour = g.find((x) => x.heading === 'Behaviour');
    expect(behaviour?.entries.filter((e) => e.kind === 'happened')).toHaveLength(2);
    expect(behaviour?.days).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(g)).not.toMatch(/\b(priority|severe|high|moderate|low|score|points)\b/i);
  });

  it('counts a disturbed night as night-time help without tagging', () => {
    const g = groupEvidence(entries, 'aa', NOW - 30 * DAY, NOW);
    const night = g.find((x) => x.heading === 'Help during the night');
    expect(night?.entries.length).toBeGreaterThan(0);
    expect(night?.atNight).toBeGreaterThan(0);
  });

  it('leaves contacts out of the evidence', () => {
    const g = groupEvidence(entries, 'chc', NOW - 30 * DAY, NOW);
    expect(g.flatMap((x) => x.entries).some((e) => e.kind === 'contact')).toBe(false);
  });

  it('has headings for every form', () => {
    for (const f of ['chc', 'pip', 'aa', 'dla'] as const) expect(headingsFor(f).length).toBeGreaterThan(1);
  });

  it('adds caring hours by week and counts weeks at 35 hours', () => {
    const monday = mondayOf(NOW);
    const care = Array.from({ length: 6 }, (_, i) => entry({ kind: 'care-given', at: monday + i * DAY + 3600_000, minutes: 360, helpType: 'personal-care' }));
    const h = caringHours(care, NOW - 30 * DAY, NOW + 7 * DAY);
    expect(h.weeks).toHaveLength(1);
    expect(h.weeks[0]?.minutes).toBe(2160);
    expect(h.weeksOver35).toBe(1);
  });

  it('lists areas with no notes', () => {
    expect(gaps(entries, NOW - 30 * DAY, NOW)).not.toContain('Distress and behaviour');
    expect(gaps(entries, NOW - 30 * DAY, NOW)).toContain('Eating and drinking');
  });
});

describe('patterns', () => {
  it('needs at least three notes before naming a pattern', () => {
    const two = [0, 1].map((i) => entry({ kind: 'happened', at: new Date(2026, 9, 1 + i, 18).getTime(), needs: ['tired'] }));
    expect(findPatterns(two, [], undefined)).toEqual([]);
    const four = [0, 1, 2, 3].map((i) => entry({ kind: 'happened', at: new Date(2026, 9, 1 + i, 18).getTime(), needs: ['tired'] }));
    const p = findPatterns(four, [], undefined);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.entryIds.length >= 3)).toBe(true);
  });
});
