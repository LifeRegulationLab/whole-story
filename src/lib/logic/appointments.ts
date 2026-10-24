import type { Appointment, Entry } from '../model/types';
import { formatDateTime } from './summaries';

/**
 * Appointments: getting ready, the room, and what happens next. Everything leaves the app only
 * when the carer chooses: a calendar file, the share sheet, or a link.
 */

/** "YYYY-MM-DDTHH:MM" local, as a time. */
export function whenAt(when: string | undefined): number | undefined {
  if (!when) return undefined;
  const t = new Date(when).getTime();
  return Number.isNaN(t) ? undefined : t;
}

function icsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

function icsLocal(when: string): string {
  // Kept as the carer's local clock time, so it shows at the same time on any phone.
  return `${when.replace(/[-:]/g, '').slice(0, 13)}00`;
}

function icsUtc(at: number): string {
  return new Date(at).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** A calendar file for one appointment. Opening it lets the phone's calendar (or Pace) add it. */
export function calendarFile(e: { id: string; title: string; when: string; minutes?: number; where?: string; note?: string }, now: number): string {
  const start = new Date(e.when);
  const end = new Date(start.getTime() + (e.minutes ?? 60) * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const endLocal = `${end.getFullYear()}${pad(end.getMonth() + 1)}${pad(end.getDate())}T${pad(end.getHours())}${pad(end.getMinutes())}00`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Life Regulation Lab//Whole Story//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@whole-story`,
    `DTSTAMP:${icsUtc(now)}`,
    `DTSTART:${icsLocal(e.when)}`,
    `DTEND:${endLocal}`,
    `SUMMARY:${icsText(e.title)}`,
  ];
  if (e.where) lines.push(`LOCATION:${icsText(e.where)}`);
  if (e.note) lines.push(`DESCRIPTION:${icsText(e.note)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/** Questions not yet answered: never asked, or marked still unclear. */
export function openQuestions(a: Appointment): Appointment['questions'] {
  return a.questions.filter((q) => q.status !== 'answered' && q.text.trim());
}

function block(title: string, text: string | undefined): string[] {
  return text?.trim() ? [title, text.trim(), ''] : [];
}

/** Plain words to send or print. Their words and the carer's stay under separate headings. */
export function summaryText(a: Appointment, personName: string): string {
  const at = whenAt(a.when);
  const answered = a.questions.filter((q) => q.status === 'answered' && q.text.trim());
  const open = openQuestions(a);
  const out = [`Appointment with ${a.with}${at ? `, ${formatDateTime(at)}` : ''}`, ''];
  out.push(...block(`In ${personName}'s own words`, a.theirWords));
  out.push(...block('What I have noticed', a.noticed));
  if (answered.length) out.push('Answered', ...answered.map((q) => `- ${q.text}${q.answer?.trim() ? `: ${q.answer.trim()}` : ''}`), '');
  if (open.length) out.push('Still to ask or still unclear', ...open.map((q) => `- ${q.text}`), '');
  out.push(...block('What was said', a.said));
  out.push(...block(`What ${personName} said`, a.theySaid));
  const next = a.next.filter((n) => n.what.trim());
  if (next.length)
    out.push('What happens next', ...next.map((n) => `- ${n.what.trim()}${n.who?.trim() ? ` (${n.who.trim()})` : ''}${n.by ? `, by ${n.by}` : ''}`), '');
  const nextAt = whenAt(a.nextWhen);
  if (nextAt) out.push(`Next appointment: ${formatDateTime(nextAt)}`, '');
  if (a.reference?.trim()) out.push(`Reference: ${a.reference.trim()}`, '');
  return out.join('\n').trim() + '\n';
}

/** The log entry for the record: a call or appointment, with what was agreed and the reference. */
export function toEntry(a: Appointment, personName: string, author: { uid: string; name: string }, now: number): Entry {
  const at = whenAt(a.when) ?? now;
  const what = [
    a.said?.trim(),
    a.theySaid?.trim() ? `${personName} said: ${a.theySaid.trim()}` : '',
    ...a.questions.filter((q) => q.status === 'answered' && q.answer?.trim()).map((q) => `${q.text}: ${q.answer?.trim() ?? ''}`),
  ]
    .filter(Boolean)
    .join('\n');
  const e: Entry = {
    id: a.entryId ?? `appt-${a.id}`,
    kind: 'contact',
    at,
    writtenAt: now,
    author: author.uid,
    authorName: author.name,
    title: `Appointment with ${a.with}`,
    what: what || 'Appointment',
    service: a.with,
  };
  const agreed = a.next
    .filter((n) => n.what.trim())
    .map((n) => `${n.what.trim()}${n.who?.trim() ? ` (${n.who.trim()})` : ''}${n.by ? `, by ${n.by}` : ''}`)
    .join('\n');
  if (agreed) e.agreed = agreed;
  if (a.reference?.trim()) e.reference = a.reference.trim();
  return e;
}

/** Upcoming first, then the most recent past ones. */
export function ordered(list: Appointment[], now: number): Appointment[] {
  const t = (a: Appointment) => whenAt(a.when) ?? a.updatedAt;
  const coming = list.filter((a) => t(a) >= now - 12 * 60 * 60 * 1000).sort((a, b) => t(a) - t(b));
  const past = list.filter((a) => t(a) < now - 12 * 60 * 60 * 1000).sort((a, b) => t(b) - t(a));
  return [...coming, ...past];
}
