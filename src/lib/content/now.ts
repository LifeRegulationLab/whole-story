import type { CareFor } from '../model/types';

/**
 * The Now cards: what to try in the next ten minutes. Fixed words, checked by a person, never
 * written by the AI helper. They work with no signal and no account.
 */

export interface NowCard {
  title: string;
  body: string;
  /** Shows the cared-for person's 'what helps' list on this card. */
  showHelps?: boolean;
  /** Shows the need chips, and logs the ones tapped. */
  showNeeds?: boolean;
  /** Offers a five-minute timer. */
  timer?: boolean;
  /** Shows the helplines. */
  helplines?: boolean;
  /** Shows the carer's own 'what helps me' list. */
  showMine?: boolean;
  /** Shows the one person they could text. */
  showSomeone?: boolean;
}

export const DANGER_LINE = 'If anyone is in danger right now, call 999.';
export const SAMARITANS_LINE =
  'If you are struggling right now, Samaritans are on 116 123, any time of the day or night, anywhere in the UK and Ireland.';

const them: NowCard[] = [
  { title: 'What helps them', body: 'From what you wrote about them.', showHelps: true },
  {
    title: 'Safety first',
    body: 'Is anyone hurt, or about to be? If so, call 999. If not, keep going. Step back if you need to; you do not have to stay close.',
  },
  {
    title: 'Lower everything',
    body: 'Lower your voice, the lights and the noise. Turn the television off. Sit down if you can, so you are not standing over them. Do not argue the point: you cannot win it, and it does not matter now.',
  },
  {
    title: 'Something may be wrong for them',
    body: 'Distress is often a need they cannot put into words. Go through these one at a time. Tap any that might fit; they are saved with today’s note.',
    showNeeds: true,
  },
  {
    title: 'Say less',
    body: 'Short sentences. Their name, your name, where they are, that they are safe. Say it the same way each time. Give them time to answer.',
  },
  {
    title: 'Change the room, not the person',
    body: 'If you can, move to somewhere quieter, or give them space and move yourself. Bring something from their list: the music, the drink, the blanket, the dog.',
  },
  {
    title: 'Give it time',
    body: 'Most of these moments pass. Stay nearby and keep things quiet. Here is a five-minute timer if it helps.',
    timer: true,
  },
  {
    title: 'If it does not pass',
    body: 'If they might be ill or hurt, or you cannot keep everyone safe, get help now.',
    helplines: true,
  },
];

const me: NowCard[] = [
  {
    title: 'You are not failing',
    body: 'This is one of the hardest things anyone does, and nobody trained you for it. Feeling you cannot carry on is a normal response to too much, not proof that you cannot.',
  },
  {
    title: 'One minute',
    body: 'Breathe in slowly. Breathe out more slowly. Four times. Drop your shoulders. Unclench your hands.',
  },
  {
    title: 'Are you safe?',
    body: 'If you feel you might hurt yourself or the person you care for, call Samaritans on 116 123 now, or 999 if anyone is in danger. Saying it out loud to someone is the right thing to do.',
    helplines: true,
  },
  { title: 'Put something down', body: 'From your own list of what helps you.', showMine: true },
  { title: 'Who could you text?', body: 'You do not have to explain. "Hard day, can you call me later?" is enough.', showSomeone: true },
  {
    title: 'Tomorrow',
    body: 'You are allowed to ask for help with this. Asking is part of the job. The Help page lists who to call, by day.',
  },
];

/** Extra first cards for particular kinds of caring. Added after 'What helps them'. */
const extras: Partial<Record<CareFor, NowCard>> = {
  autism: {
    title: 'A meltdown is not a tantrum',
    body: 'It is the body’s response to too much. Cut the input: fewer words, less noise, less light, no touching unless they want it. Let it run its course somewhere safe.',
  },
  'mental-health': {
    title: 'If they talk about ending their life',
    body: 'Take it seriously, stay calm and stay with them if it is safe. Ask them directly if they are thinking of suicide; asking does not make it more likely. If they have a crisis plan, follow it. If there is immediate danger, call 999.',
    helplines: true,
  },
  dementia: {
    title: 'Go with their reality',
    body: 'If they are looking for someone, or need to be somewhere, correcting them often makes it worse. Ask about the person or the place instead, and stay with the feeling.',
  },
};

export function themCards(careFor: CareFor[]): NowCard[] {
  const [first, ...rest] = them;
  const added = careFor.flatMap((c) => (extras[c] ? [extras[c]] : []));
  return first ? [first, ...added, ...rest] : [...added, ...rest];
}

export const meCards = me;
