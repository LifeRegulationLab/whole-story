# Content checks

Every six months (next: April 2027), and before any release:

- Ring or check the website of every helpline and local organisation in `src/lib/content/help.ts`.
  Update `CHECKED_ON`.
- Check the CHC Decision Support Tool still has the same 12 domains (`CHC_DOMAINS`), and the PIP,
  Attendance Allowance, DLA and Scottish benefit forms still use the same headings.
- Check the Carer's Allowance hours line (35 hours) in the UK and Guernsey.
- Read every Now card aloud. Fixed text only; a person signs it off.
- `npm run check`: the content tests catch exclamation marks, "journey", American spellings and
  any mention of patients, HSC or a Guernsey health service.

Wording of About sections, document headings and Now cards is our own. Do not copy forms such as
"This is me" (Alzheimer's Society) or published hospital passports; the app makes its own.
