# Whole Story

Whole Story by Life Regulation Lab is an app for family carers: people looking after someone with
dementia, a learning disability, autism, mental health problems, frailty or illness.

It does three jobs:

1. **In the moment.** The Now button is on every screen. It gives fixed, checked steps for when the
   person is struggling, or the carer is, with their own "what helps" list and the right helplines.
   It works with no signal and no account.
2. **Writing it down.** A few taps to record something that happened, a bad night, a health change,
   help given, a call with a service, a medicine given (with as-needed warnings from the label) and
   whether it helped. Everything saves on the phone straight away.
3. **The papers.** From the carer's own words it makes the documents services ask for: an About
   them page, a hospital passport, a GP summary, a respite handover, a care home pack, NHS continuing
   healthcare evidence under the 12 domains, benefit form evidence (Attendance Allowance, PIP, DLA,
   Scottish equivalents) with caring hours for Carer's Allowance, a "what I am seeing" report for a
   school or EHCP, and a crisis plan.

Family can join with a code. The main carer decides what each person sees. The carer's own
check-ins are never shared.

## Running it

```sh
npm install
cp .env.example .env    # the public web settings for Firebase; .env.production already has them
npm run dev
npm run check           # types, lint, build, tests: must pass before anything is called done
```

The iPhone and iPad app is the same web app in a Capacitor shell: `npm run build:shell`, then open
`ios/App/App.xcodeproj` (run `npx cap add ios` once first).

## Where things are

- `src/lib/model/types.ts`: everything the app keeps.
- `src/lib/content/`: fixed wording (Now cards, areas mapped to form headings, helplines, About sections).
- `src/lib/logic/`: as-needed checks, patterns, evidence grouping, caring hours, summaries. No AI.
- `src/lib/papers/`: the documents and the PDF writer.
- `src/lib/store/`: the device store and the shared Firestore store behind one interface.
- `src/lib/helper/` and `functions/`: the Ask helper, off by default (see `docs/AI-HELPER.md`).
- `firestore.rules`: who can read and write what.
- `docs/`: the spec and feature map, Firebase set-up, helper rules, content checks.
