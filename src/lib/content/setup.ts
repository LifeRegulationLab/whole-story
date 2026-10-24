import type { CareFor, Circle, Region } from '../model/types';

export const CARE_FOR: { code: CareFor; text: string }[] = [
  { code: 'dementia', text: 'Dementia or memory problems' },
  { code: 'learning-disability', text: 'A learning disability' },
  { code: 'autism', text: 'Autism' },
  { code: 'mental-health', text: 'Mental health' },
  { code: 'physical', text: 'Illness, frailty or a physical disability' },
  { code: 'other', text: 'Something else' },
];

export const AGE_BANDS: { code: Circle['ageBand']; text: string }[] = [
  { code: 'child', text: 'Under 16' },
  { code: 'adult', text: '16 to State Pension age' },
  { code: 'pension-age', text: 'State Pension age or over' },
];

export const REGIONS: { code: Region; text: string }[] = [
  { code: 'england', text: 'England' },
  { code: 'scotland', text: 'Scotland' },
  { code: 'wales', text: 'Wales' },
  { code: 'northern-ireland', text: 'Northern Ireland' },
  { code: 'guernsey', text: 'Guernsey' },
  { code: 'jersey', text: 'Jersey' },
  { code: 'isle-of-man', text: 'Isle of Man' },
];
