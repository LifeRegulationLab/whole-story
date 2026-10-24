# Whole Story: spec v2 and feature map

Written 24 October 2026 by Stuart Houlihan. Replaces the CareShift spec of 9 October 2026.

## Who it is for

Unpaid family carers in the UK, Channel Islands and Isle of Man, looking after someone with
dementia, a learning disability, autism, mental health problems, frailty, illness or physical
disability, child or adult. One carer can start alone on their phone with no account. Family can
join later.

## The name

"CareShift" sounded like a staffing rota. **Whole Story** says what the app does: it keeps the whole
story of the person, in the family's words, so nobody has to tell it from scratch again.

## What the research showed

From App Store screens and reviews of 19 apps (Jointly, Elevmi, Lotsa Helping Hands, ianacare,
CaringBridge, Medisafe, Caily, My Virtual Carer, Caring Village, Birdie, Care Logger, Family
Caregiver, the Plymouth hospital passport, CareLineLive, ShiftCare, Careberry Family, My ALZ Journey,
Alzheimer's Care Partner, MyTherapy), carer forum posts, and the public CHC, PIP, Attendance
Allowance, DLA and Carer's Allowance guidance and forms. Screens and notes are in
`/mnt/project-files/carer-app/research/`. Apps were studied by public behaviour only.

The most common complaint in reviews was unreliability: lost notes, sign-up that fails, sync that
breaks. So Whole Story saves to the device first, every time, and works with no account.

## Feature map

| Carers say | Whole Story does | Others that try | Why ours is different |
|---|---|---|---|
| Apps lose what I wrote, or need an account first | Device-first store, no account needed, Firestore offline cache once shared | All | Writing never waits for the network |
| In the moment I don't know what to do | Now button on every screen: fixed steps for them and for me, their own "what helps", timer, helplines | Elevmi (advice cards), Bridgit (AI chat) | Fixed, checked words; no AI; works offline |
| Nobody believes how bad it is | Quick logs with before, what, after; nights; health changes; flags for professionals | Care Logger, Birdie (paid carers) | Written for families in plain words, with dates kept honest |
| I repeat their story to every new person | About them in 19 sections; hospital passport, respite handover, care home pack made from it | Plymouth passport, "This is me" (paper) | Fill once, used everywhere; own wording |
| Benefit and CHC forms are impossible | Every note can be tagged with areas of life; packs group examples under the 12 CHC domains or the form's headings, with nights and days counted; family views section; caring hours by week against 35 hours | None found | Nothing scored; the carer's own examples where the assessor looks |
| Medicines, and as-needed doses especially | Label copied word for word; due today; give a dose with warnings from the label's gap and daily limit; "did it help" asked later | Medisafe, MyTherapy, CareLineLive | Warn, never block, never suggest a dose; helped rate shown to the GP |
| I can't see the patterns | Fixed-rule patterns (time of day, day of week, what seemed behind it, what helped) after three notes | Few | Counted, never interpreted |
| Family don't help, or don't know how | Invite with a code; per-person view settings; messages; requests for help from saved asks in the carer's words, each followed through asked, accepted, done and confirmed by the carer; only the About sections the carer ticks go with a request; when nobody says yes after a day (or the day is close) the carer chooses: ask the next person, ask everyone, or move it; "Since you were last here" for a helper; a weekly update to send | Jointly, Lotsa, ianacare, Caily | The main carer controls who sees what, and the app never messages anyone on its own |
| I'm shut out by services | Calls and appointments logged with what was agreed and reference numbers; "Your part in their care" | None | Builds a record the carer can quote |
| I don't know who does what | Who to ask for what, by region, including Guernsey | Jointly (guides) | Short, local, checked every six months |
| I'm going under | Private daily check-in in the carer's own four words; Me page; nudge to a carer's assessment after repeated hard days | Few | Never shared, never scored |
| When things go wrong, nobody has a plan | Crisis plan written with the person, early signs logged in one tap, crisis plan PDF | None for families | Their wishes in their words |
| Moving into a care home | Care home pack: their story, day, wishes, papers and contacts | None | Made from what is already written |

## Screens

Today, Log, Them (About, Medicines, Crisis plan, Who's who, Where papers are kept), Family, Papers,
Help, Me, and Now on every screen. Ask appears in Help only when the helper is on.

## Rules that do not bend

See `CLAUDE.md`. In short: plain words, nothing clinical, no scores, label-only medicines, fixed Now
cards, carer as author of every file, offline first, private check-ins.

## Not in this version

- Uploading photos of letters (needs Firebase Storage on Blaze). Papers record where things are kept.
- Reminders and notifications on the phone.
- A view for the person being supported. It changes who the app is for, so it waits for a decision.
- Sign-in links opening straight into the iPhone app (the web link works; app links come with the App Store build).
- Ask helper switched on (see `docs/AI-HELPER.md`).
- Welsh and other languages.
