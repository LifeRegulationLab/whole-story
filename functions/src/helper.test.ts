import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { handleHelper, type HelperDeps } from './helper';
import { SUPPORT_TEXT } from './safety';

const deps = (over: Partial<HelperDeps> = {}): HelperDeps => ({
  on: 'true',
  origins: ['https://whole-story-lrl.web.app'],
  verifyUser: async (t) => (t === 'good' ? 'u1' : undefined),
  model: vi.fn(async () => ({ text: 'Ask the council for a carer’s assessment!', refused: false })),
  ...over,
});

const post = (body: unknown, token = 'good') =>
  new Request('https://x/helper', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', origin: 'https://whole-story-lrl.web.app' },
    body: JSON.stringify(body),
  });

describe('helper server', () => {
  it('uses the same safety rules as the app', () => {
    const app = readFileSync(join(__dirname, '../../src/lib/helper/safety.ts'), 'utf8');
    const copy = readFileSync(join(__dirname, 'safety.ts'), 'utf8');
    expect(copy.split('\n').slice(1).join('\n')).toBe(app);
  });

  it('is off unless switched on', async () => {
    expect((await handleHelper(post({ question: 'hi' }), deps({ on: undefined }))).status).toBe(503);
  });

  it('needs a sign-in', async () => {
    expect((await handleHelper(post({ question: 'hi' }, 'bad'), deps())).status).toBe(401);
  });

  it('meets distress with the support line and never calls the model', async () => {
    const d = deps();
    const r = await handleHelper(post({ question: 'I think I might hurt him' }), d);
    expect(await r.json()).toEqual({ text: SUPPORT_TEXT, support: true });
    expect(d.model).not.toHaveBeenCalled();
  });

  it('checks earlier messages too', async () => {
    const d = deps();
    await handleHelper(post({ question: 'what now', history: [{ role: 'carer', text: 'I want to die' }] }), d);
    expect(d.model).not.toHaveBeenCalled();
  });

  it('answers ordinary questions and takes out exclamation marks', async () => {
    const r = await handleHelper(post({ question: 'How do I get a break?' }), deps());
    expect(await r.json()).toEqual({ text: 'Ask the council for a carer’s assessment.' });
    expect(r.headers.get('access-control-allow-origin')).toBe('https://whole-story-lrl.web.app');
  });

  it('hides replies that give doses', async () => {
    const r = await handleHelper(post({ question: 'She is agitated in the evening' }), deps({ model: async () => ({ text: 'Give 0.5mg', refused: false }) }));
    expect((await r.json()).text).toContain('could not answer');
  });
});
