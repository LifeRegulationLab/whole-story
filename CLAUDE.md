# Whole Story

Read `README.md` and `docs/SPEC.md` first. Stack: Vite 6, React 19, TypeScript strict, React Router 7,
Tailwind 4, Firebase (Auth email link, Firestore in europe-west2), pdf-lib, Capacitor 8.
`npm run check` must pass before saying anything is done.

- For family carers, written by a loved one about a loved one. Copy is British English, plain and
  short, adult to adult. No exclamation marks, no cheer, no therapy tone, no "journey" (the PIP
  activity "Planning and following journeys" is the one exception, as it is the form's own words).
- Never clinical. Nothing scores, stages, levels or diagnoses the person. Evidence packs group the
  carer's own examples under form headings; the app never chooses a CHC level or benefit points.
- Medicines: values only from the pharmacy label. As-needed checks warn, never block, never suggest a dose.
- The Now cards are fixed text checked by a person. The AI helper never writes them.
- The helper is off by default and follows `docs/AI-HELPER.md`. Distress words and medicine
  questions are answered on the device without calling the model. `functions/src/safety.ts` is a copy
  of `src/lib/helper/safety.ts`; a test checks they match.
- Every file the app makes has the carer as author and "Whole Story by Life Regulation Lab" as
  creator and producer. No tool or AI names in files or metadata.
- Never mention patients, colleagues, HSC or any Guernsey health service.
- Works offline first. Writes go to the device straight away; Firestore keeps a local cache.
- Helplines and local organisations are checked every six months (`docs/CONTENT-CHECKS.md`).
- Repository files carry Stuart Houlihan as author.
