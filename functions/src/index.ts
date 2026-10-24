import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { isTester, type Plan } from './billing';
import { handleHelper } from './helper';

/**
 * The Ask helper, in London. Off until HELPER_ON is "true" and the model key secret is set.
 * Needs the Blaze plan. Deploy: firebase deploy --only functions:default
 * Payments for Plus are in billing/, a separate set of functions, so this deploys without Stripe keys.
 */

initializeApp();
const MODEL_KEY = defineSecret('MODEL_API_KEY');
const HELPER_ON = defineString('HELPER_ON', { default: 'false' });
const ORIGINS = defineString('HELPER_ORIGINS', { default: 'https://whole-story-lrl.web.app,https://whole-story-lrl.firebaseapp.com,capacitor://localhost' });
const MODEL = 'claude-sonnet-5-5';
const TESTERS = defineString('PLUS_TESTERS', { default: '' });
const OPTS = { region: 'europe-west2', maxInstances: 5, timeoutSeconds: 60, invoker: 'public' } as const;

async function hasPlus(uid: string): Promise<boolean> {
  const plan = (await getFirestore().doc(`plans/${uid}`).get()).data() as Plan | undefined;
  if (plan?.active) return true;
  const email = (await getAuth().getUser(uid)).email;
  return isTester(email, TESTERS.value());
}

export const helper = onRequest({ ...OPTS, secrets: [MODEL_KEY] }, async (req, res) => {
  const request = new Request(`https://${req.hostname}${req.originalUrl}`, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
  });
  const response = await handleHelper(request, {
    on: HELPER_ON.value(),
    origins: ORIGINS.value().split(','),
    verifyUser: async (token) => {
      try {
        return (await getAuth().verifyIdToken(token)).uid;
      } catch {
        return undefined;
      }
    },
    hasPlus,
    model: async (system, messages) => {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': MODEL_KEY.value(), 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages }),
      });
      if (!r.ok) throw new Error(`model ${r.status} ${(await r.text()).slice(0, 300)}`);
      const body = (await r.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
      return { refused: body.stop_reason === 'refusal', text: (body.content ?? []).map((c) => c.text ?? '').join('') };
    },
  });
  res.status(response.status);
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.send(await response.text());
});
