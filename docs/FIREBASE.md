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

## Whole Story Plus (Stripe)

Ask is part of Plus. Everything else stays free. Plans live in `plans/{uid}`, written only by the
server. Testers in `PLUS_TESTERS` (functions/.env) always have Plus.

Functions: `checkout` (opens Stripe's payment page), `portal` (change card or cancel) and
`stripeWebhook` (Stripe tells us when Plus starts or ends).

Before deploying those three:
1. In Stripe, make a product "Whole Story Plus" with a monthly price. Put its `price_...` id in
   `STRIPE_PRICE_ID` in billing/.env.
2. Add a webhook endpoint `https://europe-west2-whole-story-lrl.cloudfunctions.net/stripeWebhook`
   for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`.
3. Put the secret key and the webhook signing secret in Secret Manager as `STRIPE_SECRET_KEY` and
   `STRIPE_WEBHOOK_SECRET`. Keys never go in the repo or in chat.

The payment functions are a separate set (billing/), so the helper deploys without them:
`firebase deploy --only hosting,firestore:rules,functions:default`. Once Stripe is set up, set
`STRIPE_PRICE_ID` in billing/.env and `VITE_PLUS_ON=true` in .env.production, then
`npm --prefix billing ci` and `firebase deploy --only hosting,functions:billing`.
