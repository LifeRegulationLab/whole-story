import { describe, expect, it } from 'vitest';
import { checkReply, distressCheck, gate, medicineCheck, SUPPORT_TEXT } from '../lib/helper/safety';

describe('helper safety', () => {
  it.each([
    'I want to die',
    'I’m afraid I’ll hurt him',
    'I could hit her today',
    'she hit me again',
    'he’s not breathing',
    'I can’t find him anywhere',
    'thinking about suicide',
  ])('meets "%s" with the support line and no model', (text) => {
    expect(distressCheck(text)).toBe(true);
    const g = gate(text);
    expect(g.send).toBe(false);
    if (!g.send) expect(g.reply).toBe(SUPPORT_TEXT);
  });

  it.each(['Can I give another tablet?', 'How much should I give', 'can we crush her tablets', 'should we reduce the dose'])(
    'sends "%s" to the pharmacist',
    (text) => {
      expect(medicineCheck(text)).toBe(true);
      expect(gate(text).send).toBe(false);
    },
  );

  it('lets ordinary questions through', () => {
    expect(gate('How do I ask for a carer’s assessment?').send).toBe(true);
    expect(gate('What is a hospital passport for?').send).toBe(true);
  });

  it('never shows doses, diagnoses or stages', () => {
    expect(checkReply('Try 5mg in the evening').ok).toBe(false);
    expect(checkReply('It sounds like she has dementia').ok).toBe(false);
    expect(checkReply('This is stage 5').ok).toBe(false);
    expect(checkReply('Ask the GP for a review!')).toEqual({ ok: true, text: 'Ask the GP for a review.' });
  });
});

describe('questions about the helper', () => {
  it('answers them without the model', async () => {
    const { gate, ABOUT_TEXT } = await import('../lib/helper/safety');
    for (const q of ['What can you do?', 'what can you help with', 'Who are you', 'What can I ask?', 'How does this work']) {
      expect(gate(q)).toEqual({ send: false, reply: ABOUT_TEXT, support: false });
    }
    expect(gate('What can I do when Mum will not wash?')).toEqual({ send: true });
  });
});
