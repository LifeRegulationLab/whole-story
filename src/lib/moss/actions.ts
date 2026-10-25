import type { MossAction } from '../../components/MossCompanion';

/** What Moss can open in Whole Story: the app's own pages, nothing new. */
export const MOSS_ACTIONS: MossAction[] = [
  { label: 'Now', detail: 'What to try right now', to: '/now' },
  { label: 'Log something', detail: 'What happened, in a few words', to: '/log' },
  { label: 'Medicines', detail: 'From the pharmacy label', to: '/them/medicines' },
  { label: 'Papers', detail: 'Letters and evidence packs to make', to: '/papers' },
  { label: 'Help', detail: 'Who to call, and Ask', to: '/help' },
];

export const MOSS_SETTINGS = '/me';
