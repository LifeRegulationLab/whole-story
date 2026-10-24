# Firebase

- Project: **whole-story-lrl** ("Whole Story"), owned by stuart@liferegulationlab.com.
- Firestore: `(default)` database, Native mode, **europe-west2 (London)**. Created 24 October 2026.
- Web app: "Whole Story Web". Its settings are public identifiers and live in `.env.production`.
  Access is controlled by `firestore.rules` and sign-in, not by hiding these.
- Plan: Spark (free). The Ask helper (Cloud Functions) and file uploads (Storage) need Blaze.

## Still to switch on in the console

1. Authentication > Sign-in method > **Email/Password**, then tick **Email link (passwordless sign-in)**.
2. Authentication > Settings > Authorised domains: add the live web address if it is not
   `whole-story-lrl.web.app` or `whole-story-lrl.firebaseapp.com`.

## Deploying

```sh
npm ci && npm run check
npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting --project whole-story-lrl
```

The helper, once on Blaze and approved: set the secret `MODEL_API_KEY` (Stuart enters it; never
in chat or files), set `HELPER_ON=true`, deploy with `--only functions`, then build the app with
`VITE_HELPER_ON=true` and `VITE_HELPER_URL` set to the function's address.

## Data layout

- `circles/{circleId}`: the cared-for person, `members` (role and what they see) and `memberIds`.
- `circles/{circleId}/{entries|doses|medicines|contacts|papers|tasks|cover|messages}/{id}`.
- `circles/{circleId}/docs/{about|crisis}`.
- `users/{uid}`: the carer's own settings; `users/{uid}/checkins/{id}`: their check-ins, private.
- `invites/{code}`: one-use, seven-day codes to join a circle.

Deleting an account deletes every circle the person leads, with all its records, and removes them
from any other circle.
