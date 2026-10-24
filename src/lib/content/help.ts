import type { CareFor, Region } from '../model/types';

/**
 * Helplines and local organisations. Numbers were checked against public listings on
 * 24 October 2026 and must be checked again every six months (see docs/CONTENT-CHECKS.md).
 */
export const CHECKED_ON = '2026-10-24';

export interface Helpline {
  name: string;
  phone?: string;
  text?: string;
  web?: string;
  when: string;
  forWhat: string;
  /** Empty means everyone. */
  careFor?: CareFor[];
  regions?: Region[];
  /** Shown on the Now cards. */
  urgent?: boolean;
}

const UK: Region[] = ['england', 'scotland', 'wales', 'northern-ireland'];

export const HELPLINES: Helpline[] = [
  { name: 'Emergency', phone: '999', when: 'Any time', forWhat: 'If anyone is in danger or badly hurt', urgent: true },
  {
    name: 'NHS 111',
    phone: '111',
    when: 'Any time',
    forWhat: 'Urgent health advice when it is not an emergency',
    regions: ['england', 'scotland', 'wales'],
    urgent: true,
  },
  {
    name: 'Samaritans',
    phone: '116 123',
    when: 'Any time, day or night',
    forWhat: 'If you are struggling and need to talk',
    urgent: true,
  },
  { name: 'Shout', text: 'Text SHOUT to 85258', when: 'Any time', forWhat: 'If you would rather text than talk', regions: UK },
  { name: 'Carers UK Helpline', phone: '0808 808 7777', web: 'https://www.carersuk.org', when: 'Weekdays', forWhat: 'Benefits, rights and practical help for carers', regions: UK },
  {
    name: 'Dementia UK Admiral Nurse Helpline',
    phone: '0800 888 6678',
    web: 'https://www.dementiauk.org',
    when: 'Most days, including evenings',
    forWhat: 'Talking to a specialist dementia nurse',
    careFor: ['dementia'],
  },
  {
    name: "Alzheimer's Society Dementia Support Line",
    phone: '0333 150 3456',
    web: 'https://www.alzheimers.org.uk',
    when: 'Every day',
    forWhat: 'Advice and support about any kind of dementia',
    careFor: ['dementia'],
  },
  {
    name: 'Mencap Learning Disability Helpline',
    phone: '0808 808 1111',
    web: 'https://www.mencap.org.uk',
    when: 'Weekdays',
    forWhat: 'Advice for families of people with a learning disability',
    careFor: ['learning-disability'],
    regions: UK,
  },
  {
    name: 'National Autistic Society Helpline',
    phone: '0808 800 4104',
    web: 'https://www.autism.org.uk',
    when: 'Weekdays',
    forWhat: 'Advice for autistic people and their families',
    careFor: ['autism'],
  },
  {
    name: 'Contact helpline',
    phone: '0808 808 3555',
    web: 'https://contact.org.uk',
    when: 'Weekdays, 9.30am to 5pm',
    forWhat: 'Families with a disabled child aged up to 25',
    careFor: ['learning-disability', 'autism', 'physical', 'other'],
    regions: UK,
  },
  {
    name: 'Rethink Mental Illness Advice',
    phone: '0808 801 0525',
    web: 'https://www.rethink.org',
    when: 'Weekdays, daytime',
    forWhat: 'Advice for people affected by mental illness, including carers',
    careFor: ['mental-health'],
    regions: UK,
  },
  {
    name: 'Mind Infoline',
    phone: '0300 123 3393',
    web: 'https://www.mind.org.uk',
    when: 'Weekdays',
    forWhat: 'Information about mental health and where to get help',
    careFor: ['mental-health'],
    regions: ['england', 'wales'],
  },
  {
    name: 'YoungMinds Parents Helpline',
    phone: '0808 802 5544',
    web: 'https://www.youngminds.org.uk',
    when: 'Weekdays, 9.30am to 4pm',
    forWhat: "If you are worried about a child or young person's mental health",
    careFor: ['mental-health', 'autism'],
    regions: UK,
  },
];

export interface Organisation {
  name: string;
  what: string;
  phone?: string;
  email?: string;
  web?: string;
  regions: Region[];
  careFor?: CareFor[];
}

/** Local organisations. Guernsey first, as the home of Life Regulation Lab; UK finders below. */
export const LOCAL: Organisation[] = [
  {
    name: 'Carers Guernsey',
    what: 'Support, information and peer support for unpaid carers of all ages',
    regions: ['guernsey'],
  },
  {
    name: 'States of Guernsey carers team',
    what: "Questions about the island's Carers Action Plan",
    phone: '01481 732546',
    email: 'carers@gov.gg',
    regions: ['guernsey'],
  },
  {
    name: "Alzheimer's Society Dementia Support Guernsey",
    what: 'Face-to-face and phone help for people with dementia and their carers',
    phone: '01481 233700',
    email: 'Guernsey@alzheimers.org.uk',
    regions: ['guernsey'],
    careFor: ['dementia'],
  },
  {
    name: "Guernsey Alzheimer's Association",
    what: 'Carer support groups and social activities',
    phone: '01481 245121',
    regions: ['guernsey'],
    careFor: ['dementia'],
  },
  {
    name: 'Dementia Friendly Guernsey',
    what: 'Awareness and activities for people living with dementia',
    phone: '01481 263132',
    email: 'info@dementiafriendly.org.gg',
    regions: ['guernsey'],
    careFor: ['dementia'],
  },
  {
    name: 'Guernsey Mind',
    what: 'Mental health support; no referral needed',
    phone: '01481 722959',
    email: 'info@guernseymind.org.gg',
    regions: ['guernsey'],
    careFor: ['mental-health'],
  },
  {
    name: 'Autism Guernsey',
    what: 'Support for autistic people and their families',
    email: 'office@autismguernsey.org.gg',
    web: 'https://www.autismguernsey.org.gg',
    regions: ['guernsey'],
    careFor: ['autism'],
  },
  {
    name: 'Carers Trust: carer services near you',
    what: 'Find your local carers centre for breaks, advice and groups',
    web: 'https://carers.org',
    regions: UK,
  },
  {
    name: 'Your council: carer’s assessment',
    what: 'Ask adult social care (or children’s services for a child) for a carer’s assessment',
    web: 'https://www.nhs.uk/social-care-and-support/support-and-benefits-for-carers/carer-assessments/',
    regions: ['england', 'wales'],
  },
];

export function helplinesFor(careFor: CareFor[], region: Region): Helpline[] {
  return HELPLINES.filter(
    (h) =>
      (h.regions === undefined || h.regions.includes(region)) &&
      (h.careFor === undefined || h.careFor.some((c) => careFor.includes(c))),
  );
}

export function localFor(careFor: CareFor[], region: Region): Organisation[] {
  return LOCAL.filter(
    (o) => o.regions.includes(region) && (o.careFor === undefined || o.careFor.some((c) => careFor.includes(c))),
  );
}

/** "Who does what": the plain answer to the question carers ask most. */
export interface WhoDoes {
  question: string;
  answer: string;
  regions: Region[];
}

export const WHO_DOES_WHAT: WhoDoes[] = [
  {
    question: 'Help for me as a carer (breaks, equipment, support)',
    answer: 'Ask your council’s adult social care team for a carer’s assessment. It is free, and you can ask even if the person you care for has not been assessed.',
    regions: ['england', 'wales', 'scotland'],
  },
  {
    question: 'Help for them at home (care workers, day centres, respite)',
    answer: 'Ask the same council team for a needs assessment for the person you care for. For a child, ask children’s services.',
    regions: ['england', 'wales', 'scotland'],
  },
  {
    question: 'Money for me as a carer',
    answer: 'Carer’s Allowance (Carer Support Payment in Scotland) if you care for 35 hours a week or more for someone getting certain disability benefits. Whole Story can keep a record of your hours.',
    regions: ['england', 'wales', 'scotland', 'northern-ireland'],
  },
  {
    question: 'Money for the person I care for',
    answer: 'Attendance Allowance if they are over State Pension age, PIP if they are 16 to State Pension age, Disability Living Allowance for a child. Scotland has its own versions. Whole Story can gather your examples for the form.',
    regions: ['england', 'wales', 'scotland', 'northern-ireland'],
  },
  {
    question: 'NHS paying for all their care',
    answer: 'Ask their GP, social worker or hospital team for an NHS continuing healthcare checklist. Whole Story can gather your examples under the 12 areas the assessment looks at.',
    regions: ['england'],
  },
  {
    question: 'Help as a carer in Guernsey',
    answer: 'Carers Guernsey for support and advice. The States of Guernsey Social Security team for Carer’s Allowance and Severe Disability Benefit; both depend on income and on 35 hours a week of care.',
    regions: ['guernsey'],
  },
];
