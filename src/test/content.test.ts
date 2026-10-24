import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HELPLINES, LOCAL } from '../lib/content/help';

const ROOT = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? (d.name === 'test' ? [] : files(join(dir, d.name))) : /\.(ts|tsx)$/.test(d.name) ? [join(dir, d.name)] : [],
  );
}

/** Words shown to carers: quoted strings and JSX text. */
function shownText(src: string): string[] {
  const strings = [...src.matchAll(/'([^'\n]{12,})'|"([^"\n]{12,})"|`([^`]{12,})`/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
  const jsx = [...src.matchAll(/>\s*([A-Z][^<>{}\n]{8,})\s*</g)].map((m) => m[1] ?? '');
  return [...strings, ...jsx];
}

describe('words', () => {
  const all = files(ROOT).flatMap((f) => shownText(readFileSync(f, 'utf8')).map((t) => ({ f, t })));

  it('has no exclamation marks in anything shown', () => {
    const bad = all.filter(({ t }) => /[A-Za-z]!(\s|$)/.test(t) && !t.includes('!=='));
    expect(bad).toEqual([]);
  });

  it('avoids journey metaphors and cheer', () => {
    const bad = all.filter(({ t }) => /\b(journey|amazing|awesome|you've got this|superhero|warrior)\b/i.test(t) && !t.includes('Planning and following journeys'));
    expect(bad).toEqual([]);
  });

  it('never mentions patients, HSC or a Guernsey health service', () => {
    const bad = all.filter(({ t }) => /\b(patients?|HSC|Health and Social Care|Princess Elizabeth Hospital)\b/i.test(t));
    expect(bad).toEqual([]);
  });

  it('uses British spelling', () => {
    // Tailwind class names such as items-center are code, not words.
    const words = (t: string) => t.replace(/\b[\w:]*-center\b/g, '');
    const bad = all.filter(({ t }) => /\b(color|organization|center|behavior|program|favorite|pediatric|caregiver)\b/i.test(words(t)));
    expect(bad).toEqual([]);
  });
});

describe('helplines', () => {
  it('has a way to reach each one', () => {
    for (const h of HELPLINES) expect(Boolean(h.phone || h.text || h.web)).toBe(true);
    for (const o of LOCAL) expect(Boolean(o.phone || o.email || o.web || o.what)).toBe(true);
  });
});
