// Copied from src/lib/helper/safety.ts by "npm run copy-safety". Do not edit here; a test checks the two match.
/**
 * The helper's safety rules. The same checks run on the device, before anything is sent, and in
 * the server function, before the model sees a message and before a reply is shown.
 */

export const SUPPORT_TEXT =
  'It sounds like things are very hard right now. You do not have to manage this on your own. ' +
  'If anyone is in danger, call 999. ' +
  'Samaritans are on 116 123, any time of the day or night, anywhere in the UK and Ireland. ' +
  'Carers UK’s helpline is 0808 808 7777.';

export const CANNOT_ANSWER = 'The helper could not answer that. Try asking in a different way, or look in Help.';

export const MEDICINE_TEXT =
  'The helper does not answer questions about doses or changing medicines. ' +
  'Ask the pharmacist, the GP or NHS 111. The label on the box is the instruction to follow.';

/**
 * Words and phrases that mean the model is not called and the support line is shown instead.
 * Carers also say when they fear they might hurt the person, or the person might hurt someone.
 * A word list will sometimes catch a message that was not about crisis; that is the safer mistake.
 */
const DISTRESS = [
  /\bsuicid/,
  /\bkill(ing)? (my ?self|him|her|them)\b/,
  /\bend(ing)? (my|it) (life|all)\b/,
  /\bend it all\b/,
  /\b(want|wanted|wanting) to die\b/,
  /\bbetter off dead\b/,
  /\bbetter off without me\b/,
  /\bno (reason|point) (in )?(living|being alive|going on)\b/,
  /\bdon'?t want to (be alive|be here|live|wake up)\b/,
  /\bself[- ]?harm/,
  /\bhurt(ing)? my ?self\b/,
  /\bcut(ting)? my ?self\b/,
  /\boverdos/,
  /\btake all (my|his|her|their|the) (pills|tablets)\b/,
  /\bin danger\b/,
  /\bnot safe\b/,
  /\b(going to|gonna|might|could|will) (hurt|hit|harm|shake) (him|her|them|someone|somebody)\b/,
  /\bafraid i('ll| will) (hurt|hit|harm|shake)\b/,
  /\b(he|she|they)('s| is| are| has| have)? (hit|hurt|attacked|strangled|choked) me\b/,
  /\b(stopped|not) breathing\b/,
  /\bunconscious\b/,
  /\bcan'?t wake (him|her|them)\b/,
  /\bmissing\b.*\b(can'?t find|gone)\b|\b(can'?t find) (him|her|them)\b/,
];

/** Questions about doses or changing medicines go to the pharmacist, never the model. */
const MEDICINE_ASK = [
  /\bhow (much|many) (\w+ )?(should|can|do) i (give|take)\b/,
  /\b(extra|another|more|double) (dose|tablet|pill)\b/,
  /\bcan (i|we) (give|take|stop|skip|crush|halve)\b/,
  /\b(increase|reduce|lower|raise|stop|change) (the|his|her|their|my) (dose|medication|medicine|meds|tablets)\b/,
  /\b(dose|dosage)\b/,
];

function normalise(text: string): string {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ');
}

/** True when a message should be met with the support line, not the model. */
export function distressCheck(text: string): boolean {
  const t = normalise(text);
  return DISTRESS.some((pattern) => pattern.test(t));
}

/** True when a message asks about doses or changing medicines. */
export function medicineCheck(text: string): boolean {
  const t = normalise(text);
  return MEDICINE_ASK.some((pattern) => pattern.test(t));
}

/** Replies that are never shown: doses and amounts of medicine, or naming a condition or stage. */
const NEVER_SHOW = [
  /\b\d+(\.\d+)?\s?(mg|mcg|µg|ml|milligrams?|micrograms?)\b/,
  /\b(dose|dosage|doses)\b/,
  /\b(increase|reduce|lower|raise|stop|start|change|come off|skip) (your|the|his|her|their) (medication|medicine|meds|tablets|pills|dose)\b/,
  /\b(he|she|they|your (mum|dad|mother|father|son|daughter|husband|wife|partner)) (has|have|might have|may have|probably has|probably have|could have|seems? to have|sounds? like (he|she|they) (has|have)) (dementia|alzheimer'?s|autism|adhd|depression|psychosis|bipolar|schizophrenia|a disorder|delirium|sepsis|a stroke|an infection|a uti)\b/,
  /\b(stage|phase) (\d|one|two|three|four|five|six|seven|early|middle|late)\b/,
  /\b(diagnose|diagnosis)\b/,
];

export type ReplyCheck = { ok: true; text: string } | { ok: false };

/** Checks a reply from the model. A reply that breaks a rule is not shown; exclamation marks are taken out. */
export function checkReply(text: string): ReplyCheck {
  const trimmed = text.trim();
  if (trimmed === '') return { ok: false };
  const t = normalise(trimmed);
  if (NEVER_SHOW.some((pattern) => pattern.test(t))) return { ok: false };
  return { ok: true, text: trimmed.replace(/!+/g, '.').replace(/\.{2,}/g, '.') };
}

export const ABOUT_TEXT = [
  'I answer everyday questions about caring for someone. For example:',
  '- ideas for hard moments, such as refusing to wash, not sleeping or getting upset in the evening',
  '- who to ask for what: GP, social services, the council, carers centres, charities',
  '- carer’s assessments, respite, care homes and continuing healthcare',
  '- benefits forms such as Attendance Allowance, PIP and Carer’s Allowance, and what to write',
  '- looking after yourself as a carer',
  'I do not answer questions about medicines, and I am not for emergencies: call 999.',
].join('\n');

/** Questions about the helper itself get a fixed answer, without the model. */
export function aboutCheck(text: string): boolean {
  const t = normalise(text);
  return /\b(what|how) (can|do|could|will) you (do|help|answer)\b|\bwhat are you( for)?\b|\bwho are you\b|\bwhat can i ask\b|\bhow does this work\b/.test(t);
}

/** What happens to a message before it is sent. */
export type Gate = { send: true } | { send: false; reply: string; support: boolean };

export function gate(text: string): Gate {
  if (distressCheck(text)) return { send: false, reply: SUPPORT_TEXT, support: true };
  if (medicineCheck(text)) return { send: false, reply: MEDICINE_TEXT, support: false };
  if (aboutCheck(text)) return { send: false, reply: ABOUT_TEXT, support: false };
  return { send: true };
}
