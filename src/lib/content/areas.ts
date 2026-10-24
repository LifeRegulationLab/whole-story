/**
 * The parts of daily life a carer helps with, in plain words. Each log can be tagged with one or
 * more of these, and the evidence packs group entries by them.
 *
 * Each area lists the matching heading in the public forms it feeds:
 * - `chc`: the 12 care domains of the NHS continuing healthcare Decision Support Tool (England,
 *   October 2026). The app never chooses a level in a domain; it gathers the carer's examples.
 * - `pip`: the PIP and Adult Disability Payment activities (10 daily living, 2 mobility).
 * - `aa`: Attendance Allowance and Pension Age Disability Payment: help with personal care by day
 *   or night, and someone keeping watch to keep them safe.
 * - `dla`: Disability Living Allowance and Child Disability Payment for children: care and mobility.
 */

export interface Area {
  code: string;
  name: string;
  /** A prompt shown when tagging, so the carer knows what belongs here. */
  hint: string;
  chc: string[];
  pip: string[];
  aa: ('day' | 'night' | 'watching')[];
  dla: ('care' | 'mobility')[];
}

export const AREAS: Area[] = [
  {
    code: 'mood',
    name: 'Mood and feelings',
    hint: 'Worry, low mood, fear, upset, being withdrawn',
    chc: ['Psychological and emotional needs'],
    pip: ['Engaging with other people face to face'],
    aa: ['day', 'watching'],
    dla: ['care'],
  },
  {
    code: 'distress',
    name: 'Distress and behaviour',
    hint: 'Shouting, pushing, hitting out, meltdowns, leaving the house, resisting care',
    chc: ['Behaviour'],
    pip: ['Engaging with other people face to face'],
    aa: ['day', 'night', 'watching'],
    dla: ['care'],
  },
  {
    code: 'memory',
    name: 'Memory, thinking and decisions',
    hint: 'Forgetting, getting lost, not knowing the time or place, unsafe choices',
    chc: ['Cognition'],
    pip: ['Making budgeting decisions', 'Planning and following journeys'],
    aa: ['day', 'watching'],
    dla: ['care', 'mobility'],
  },
  {
    code: 'talking',
    name: 'Talking and understanding',
    hint: 'Finding words, understanding what is said, reading, using signs or pictures',
    chc: ['Communication'],
    pip: ['Communicating verbally', 'Reading and understanding signs, symbols and words'],
    aa: ['day'],
    dla: ['care'],
  },
  {
    code: 'moving',
    name: 'Moving about and falls',
    hint: 'Walking, getting up, stairs, transfers, falls or near falls',
    chc: ['Mobility'],
    pip: ['Moving around'],
    aa: ['day', 'night', 'watching'],
    dla: ['mobility', 'care'],
  },
  {
    code: 'eating',
    name: 'Eating and drinking',
    hint: 'Preparing food, eating, swallowing, drinking enough, weight',
    chc: ['Nutrition - food and drink'],
    pip: ['Preparing food', 'Taking nutrition'],
    aa: ['day'],
    dla: ['care'],
  },
  {
    code: 'toilet',
    name: 'Toilet and continence',
    hint: 'Getting to the toilet, accidents, pads, catheter, night-time toileting',
    chc: ['Continence'],
    pip: ['Managing toilet needs or incontinence'],
    aa: ['day', 'night'],
    dla: ['care'],
  },
  {
    code: 'washing',
    name: 'Washing and dressing',
    hint: 'Washing, bathing, teeth, shaving, getting dressed and undressed',
    chc: ['Other significant care needs'],
    pip: ['Washing and bathing', 'Dressing and undressing'],
    aa: ['day'],
    dla: ['care'],
  },
  {
    code: 'skin',
    name: 'Skin',
    hint: 'Sore skin, pressure areas, wounds, dressings',
    chc: ['Skin (including tissue viability)'],
    pip: ['Managing therapy or monitoring a health condition'],
    aa: ['day', 'night'],
    dla: ['care'],
  },
  {
    code: 'breathing',
    name: 'Breathing',
    hint: 'Breathlessness, coughing, oxygen, chest infections',
    chc: ['Breathing'],
    pip: ['Managing therapy or monitoring a health condition'],
    aa: ['day', 'night'],
    dla: ['care'],
  },
  {
    code: 'medicines',
    name: 'Medicines and symptoms',
    hint: 'Giving medicines, refusing them, pain, side effects, symptoms that need watching',
    chc: ['Drug therapies and medication: symptom control'],
    pip: ['Managing therapy or monitoring a health condition'],
    aa: ['day', 'night'],
    dla: ['care'],
  },
  {
    code: 'seizures',
    name: 'Seizures, faints and drowsy spells',
    hint: 'Fits, blackouts, absences, very drowsy or hard to wake',
    chc: ['Altered states of consciousness'],
    pip: ['Managing therapy or monitoring a health condition'],
    aa: ['day', 'night', 'watching'],
    dla: ['care'],
  },
  {
    code: 'night',
    name: 'Nights',
    hint: 'Waking, wandering, calling out, needing help in the night',
    chc: ['Behaviour', 'Cognition'],
    pip: [],
    aa: ['night'],
    dla: ['care'],
  },
  {
    code: 'safety',
    name: 'Keeping safe',
    hint: 'Needing someone to watch them: cooker, taps, doors, roads, strangers, self-harm',
    chc: ['Behaviour', 'Cognition'],
    pip: ['Planning and following journeys'],
    aa: ['watching', 'night'],
    dla: ['care', 'mobility'],
  },
  {
    code: 'going-out',
    name: 'Going out',
    hint: 'Getting somewhere, using transport, coping with busy places',
    chc: ['Mobility', 'Cognition'],
    pip: ['Planning and following journeys', 'Moving around'],
    aa: ['watching'],
    dla: ['mobility'],
  },
  {
    code: 'money',
    name: 'Money and post',
    hint: 'Paying bills, being taken advantage of, understanding letters',
    chc: [],
    pip: ['Making budgeting decisions'],
    aa: [],
    dla: [],
  },
];

export const AREA_BY_CODE = new Map(AREAS.map((a) => [a.code, a]));

/** The 12 continuing healthcare domains, in the order of the Decision Support Tool. */
export const CHC_DOMAINS = [
  'Breathing',
  'Nutrition - food and drink',
  'Continence',
  'Skin (including tissue viability)',
  'Mobility',
  'Communication',
  'Psychological and emotional needs',
  'Cognition',
  'Behaviour',
  'Drug therapies and medication: symptom control',
  'Altered states of consciousness',
  'Other significant care needs',
] as const;

/** PIP and Adult Disability Payment activities, in form order. */
export const PIP_ACTIVITIES = [
  'Preparing food',
  'Taking nutrition',
  'Managing therapy or monitoring a health condition',
  'Washing and bathing',
  'Managing toilet needs or incontinence',
  'Dressing and undressing',
  'Communicating verbally',
  'Reading and understanding signs, symbols and words',
  'Engaging with other people face to face',
  'Making budgeting decisions',
  'Planning and following journeys',
  'Moving around',
] as const;

/** The kinds of help a carer logs for the hours and help evidence. */
export const HELP_TYPES = [
  { code: 'personal-care', name: 'Washing, dressing or toilet' },
  { code: 'meals', name: 'Meals and drinks' },
  { code: 'medicines', name: 'Medicines' },
  { code: 'supervision', name: 'Keeping watch to keep them safe' },
  { code: 'night', name: 'Help in the night' },
  { code: 'calming', name: 'Calming and reassuring' },
  { code: 'appointments', name: 'Appointments and calls' },
  { code: 'home', name: 'Housework, shopping, money' },
  { code: 'out', name: 'Going out with them' },
] as const;
