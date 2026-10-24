# The Ask helper

Off by default, in the build (`VITE_HELPER_ON`) and for each carer (Me > Switch on the Ask helper).
Everything else in the app works without it.

## What it is for

Everyday questions about caring, services, rights, assessments and forms. It explains and points
to who to ask. It is not for emergencies and not for medicines.

## Rules

- **Distress first.** Every message from the carer, including earlier ones, is checked against a
  word list (`src/lib/helper/safety.ts`) on the device and again on the server. A match shows the
  support text (999, Samaritans 116 123, Carers UK) and the model is not called. It includes
  carers' fears of hurting the person and the person hurting them.
- **Medicines.** Questions about doses, extra doses, crushing, stopping or changing medicines are
  answered with "ask the pharmacist, GP or NHS 111" and the model is not called.
- **Replies are checked.** A reply naming an amount of medicine, a dose, a diagnosis or a stage is
  not shown. Exclamation marks are taken out.
- **It sees only what is ticked.** The kind of caring and region, the "what helps" list, and counts
  from this week's log with no names. Never the log itself, About them, contacts or papers.
- **Nothing is stored** by the server.
- It never writes the Now cards, the documents or the patterns.

## Before switching it on

1. Blaze plan on whole-story-lrl, with a monthly budget alert.
2. Stuart sets the `MODEL_API_KEY` secret himself.
3. A review of where the helper sits against the MHRA's software as a medical device guidance.
   The intended purpose stays "information and signposting for carers", never advice about an
   individual's treatment.
4. A run of the test questions in `functions/src/helper.test.ts` plus a hand-checked set of 50
   real-style carer questions.
