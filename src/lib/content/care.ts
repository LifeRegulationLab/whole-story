import type { CareFor } from '../model/types';

/** Things that might be wrong for them when they are distressed. Offered as chips in a log. */
export const NEEDS = [
  { code: 'pain', text: 'Pain or feeling unwell' },
  { code: 'toilet', text: 'Needing the toilet' },
  { code: 'hungry', text: 'Hungry or thirsty' },
  { code: 'temperature', text: 'Too hot or too cold' },
  { code: 'tired', text: 'Tired' },
  { code: 'noise', text: 'Too much noise or too many people' },
  { code: 'change', text: 'A change to the routine' },
  { code: 'scared', text: 'Frightened or confused' },
  { code: 'bored', text: 'Bored or lonely' },
  { code: 'control', text: 'Feeling told what to do' },
  { code: 'sensory', text: 'A sound, light, smell or texture' },
  { code: 'waiting', text: 'Waiting, or not knowing what comes next' },
  { code: 'medicine', text: 'Around a medicine time' },
] as const;

export const NEED_BY_CODE = new Map<string, string>(NEEDS.map((n) => [n.code, n.text]));

/** Suggestions when the carer first writes what helps. They replace them with their own. */
export const HELP_SUGGESTIONS: Record<CareFor, string[]> = {
  dementia: ['Their music', 'A cup of tea together', 'Looking at old photos', 'A short walk', 'Quiet and low light'],
  'learning-disability': ['Their favourite programme', 'Knowing what happens next', 'A familiar face', 'Time on their own'],
  autism: ['A quiet space', 'Headphones', 'Their routine kept the same', 'Fewer words', 'A favourite object'],
  'mental-health': ['Space and no questions', 'A walk', 'Someone sitting with them', 'Food and sleep', 'Their own plan'],
  physical: ['Time to rest', 'Being comfortable', 'Pain relief on time', 'Help planned in advance'],
  other: ['Quiet', 'A familiar routine', 'Someone they trust'],
};

/**
 * 'About them', written by the carer. The sections follow the order staff need on arrival:
 * what they must know, what helps, what matters to the person. Wording is our own.
 */
export interface AboutSection {
  key: string;
  title: string;
  prompt: string;
  group: 'must' | 'helps' | 'matters';
}

export const ABOUT_SECTIONS: AboutSection[] = [
  { key: 'known-as', title: 'What they like to be called', prompt: 'Their name, and what they like people to call them.', group: 'must' },
  { key: 'conditions', title: 'Health in brief', prompt: 'Conditions and allergies, in your own words. No need for medical terms.', group: 'must' },
  { key: 'communication', title: 'How they communicate', prompt: 'How they tell you things, what words or signs they use, how best to talk to them.', group: 'must' },
  { key: 'distress', title: 'When they are upset', prompt: 'How you can tell, what sets it off, what calms them.', group: 'must' },
  { key: 'pain', title: 'How they show pain', prompt: 'They may not say "pain". What do you notice instead?', group: 'must' },
  { key: 'safety', title: 'Keeping them safe', prompt: 'Falls, wandering, swallowing, anything staff must watch for.', group: 'must' },
  { key: 'eating', title: 'Eating and drinking', prompt: 'What they like, how they eat, help needed, things to avoid.', group: 'helps' },
  { key: 'toilet', title: 'Toilet', prompt: 'Routine, words they use, help needed, pads.', group: 'helps' },
  { key: 'personal-care', title: 'Washing and dressing', prompt: 'What they can do, what they need help with, how they like it done.', group: 'helps' },
  { key: 'sleep', title: 'Sleep', prompt: 'Bedtime, what helps them settle, what happens in the night.', group: 'helps' },
  { key: 'medicines', title: 'Taking medicines', prompt: 'How they take tablets best: with food, crushed, one at a time.', group: 'helps' },
  { key: 'moving', title: 'Moving about', prompt: 'Walking, sticks or frames, help with stairs or getting up.', group: 'helps' },
  { key: 'senses', title: 'Seeing, hearing and senses', prompt: 'Glasses, hearing aids, noise, light, touch.', group: 'helps' },
  { key: 'routine', title: 'A good day', prompt: 'What their day usually looks like, and what makes it a good one.', group: 'matters' },
  { key: 'life', title: 'Their life so far', prompt: 'Where they grew up, work, family, places that matter.', group: 'matters' },
  { key: 'people', title: 'Important people and pets', prompt: 'Who matters to them, and names they may mention.', group: 'matters' },
  { key: 'likes', title: 'Likes', prompt: 'Music, programmes, food, activities, things to talk about.', group: 'matters' },
  { key: 'dislikes', title: 'Dislikes', prompt: 'Things that upset or annoy them.', group: 'matters' },
  { key: 'faith', title: 'Faith, culture and identity', prompt: 'Anything staff should respect, including food, dress and prayer.', group: 'matters' },
];

export const ABOUT_GROUPS = {
  must: 'Things you must know',
  helps: 'How to help',
  matters: 'What matters to them',
} as const;

/** Which documents each kind of caring usually needs, so the right ones are offered first. */
export const PAPERS_FOR: Record<CareFor, string[]> = {
  dementia: ['about-me', 'gp', 'respite', 'care-home', 'chc', 'benefits', 'hospital'],
  'learning-disability': ['hospital', 'about-me', 'gp', 'respite', 'benefits', 'chc'],
  autism: ['what-im-seeing', 'hospital', 'about-me', 'respite', 'benefits'],
  'mental-health': ['crisis', 'gp', 'about-me', 'benefits', 'hospital'],
  physical: ['gp', 'hospital', 'respite', 'chc', 'benefits'],
  other: ['about-me', 'gp', 'hospital', 'respite', 'benefits'],
};
