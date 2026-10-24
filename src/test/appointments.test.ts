import { describe, expect, it } from 'vitest';
import { calendarFile, openQuestions, ordered, summaryText, toEntry } from '../lib/logic/appointments';
import type { Appointment } from '../lib/model/types';
import { DAY, NOW } from './fixtures';

function appt(partial: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    with: 'Memory clinic',
    when: '2026-10-30T10:30',
    questions: [
      { id: 'q1', text: 'Is the new tablet helping?', status: 'answered', answer: 'Give it four more weeks' },
      { id: 'q2', text: 'Can we have a carer’s assessment?', status: 'unclear' },
      { id: 'q3', text: 'Who do we ring at night?' },
    ],
    theirWords: 'I want to keep driving.',
    noticed: 'More confused after 4pm, most days.',
    said: 'Bloods next month.',
    theySaid: 'I am fine, I just forget.',
    next: [{ id: 'n1', what: 'Book bloods', who: 'Sam', by: '2026-11-10' }],
    reference: 'MC-1234',
    createdBy: 'u1',
    updatedAt: NOW,
    ...partial,
  };
}

describe('appointments', () => {
  it('keep the person’s words apart from what the carer noticed', () => {
    const text = summaryText(appt(), 'Mum');
    const theirs = text.indexOf("In Mum's own words\nI want to keep driving.");
    const mine = text.indexOf('What I have noticed\nMore confused after 4pm, most days.');
    expect(theirs).toBeGreaterThan(-1);
    expect(mine).toBeGreaterThan(theirs);
    expect(text).toContain('What Mum said\nI am fine, I just forget.');
    expect(text).toContain('- Is the new tablet helping?: Give it four more weeks');
    expect(text).toContain('Still to ask or still unclear\n- Can we have a carer’s assessment?\n- Who do we ring at night?');
    expect(text).toContain('- Book bloods (Sam), by 2026-11-10');
    expect(text).toContain('Reference: MC-1234');
  });

  it('carries unclear and unasked questions forward', () => {
    expect(openQuestions(appt()).map((q) => q.id)).toEqual(['q2', 'q3']);
  });

  it('makes a log entry for the record without scoring anything', () => {
    const e = toEntry(appt(), 'Mum', { uid: 'u1', name: 'Sam' }, NOW);
    expect(e).toMatchObject({ kind: 'contact', service: 'Memory clinic', reference: 'MC-1234', agreed: 'Book bloods (Sam), by 2026-11-10' });
    expect(e.what).toContain('Mum said: I am fine, I just forget.');
    expect(e.at).toBe(new Date('2026-10-30T10:30').getTime());
  });

  it('writes a calendar file at the local clock time', () => {
    const ics = calendarFile({ id: 'a1', title: 'Memory clinic, with Mum', when: '2026-10-30T10:30', where: 'Clinic 3; ground floor' }, NOW);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261030T103000');
    expect(ics).toContain('DTEND:20261030T113000');
    expect(ics).toContain('SUMMARY:Memory clinic\\, with Mum');
    expect(ics).toContain('LOCATION:Clinic 3\\; ground floor');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('lists upcoming first, then the most recent', () => {
    const list = ordered(
      [
        appt({ id: 'old', when: new Date(NOW - 10 * DAY).toISOString().slice(0, 16) }),
        appt({ id: 'soon', when: new Date(NOW + DAY).toISOString().slice(0, 16) }),
        appt({ id: 'later', when: new Date(NOW + 5 * DAY).toISOString().slice(0, 16) }),
      ],
      NOW,
    );
    expect(list.map((a) => a.id)).toEqual(['soon', 'later', 'old']);
  });
});
