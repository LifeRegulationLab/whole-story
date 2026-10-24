import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { isTester, planChange, stripeForm, verifyStripeSignature, type Plan } from './billing';
import { handleHelper } from './helper';

/**
 * The Ask helper, in London. Off until HELPER_ON is "true" and the model key secret is set.
 * Needs the Blaze plan. Deploy: firebase deploy --only functions
 */

initializeApp();
const MODEL_KEY = defineSecret('MODEL_API_KEY');
const HELPER_ON = defineString('HELPER_ON', { default: 'false' });
const ORIGINS = defineString('HELPER_ORIGINS', { default: 'https://whole-story-lrl.web.app,https://whole-story-lrl.firebaseapp.com,capacitor://localhost' });
const MODEL = 'claude-sonnet-5-5';
const TESTERS = defineString('PLUS_TESTERS', { default: '' });
const PRICE = defineString('STRIPE_PRICE_ID', { default: '' });
const APP_URL = 'https://whole-story-lrl.web.app';
const STRIPE_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_HOOK = defineSecret('STRIPE_WEBHOOK_SECRET');
const OPTS = { region: 'europe-west2', maxInstances: 5, timeoutSeconds: 60, invoker: 'public' } as const;

async function uidFrom(header: string | undefined): Promise<{ uid: string; email?: string } | undefined> {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return undefined;
  try {
    const t = await getAuth().verifyIdToken(token);
    return { uid: t.uid, ...(t.email ? { email: t.email } : {}) };
  } catch {
    return undefined;
  }
}

async function hasPlus(uid: string): Promise<boolean> {
  const plan = (await getFirestore().doc(`plans/${uid}`).get()).data() as Plan | undefined;
  if (plan?.active) return true;
  const email = (await getAuth().getUser(uid)).email;
  return isTester(email, TESTERS.value());
}

function allow(origin: string | undefined, res: { setHeader: (k: string, v: string) => void }): boolean {
  if (!origin || !ORIGINS.value().split(',').includes(origin)) return false;
  res.setHeader('access-control-allow-origin', origin);
  res.setHeader('access-control-allow-headers', 'authorization, content-type');
  res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
  res.setHeader('vary', 'origin');
  return true;
}

async function stripe(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${STRIPE_KEY.value()}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: stripeForm(params),
  });
  if (!r.ok) throw new Error(`stripe ${r.status}`);
  return (await r.json()) as Record<string, unknown>;
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
      if (!r.ok) throw new Error(`model ${r.status}`);
      const body = (await r.json()) as { stop_reason?: string; content?: { type: string; text?: string }[] };
      return { refused: body.stop_reason === 'refusal', text: (body.content ?? []).map((c) => c.text ?? '').join('') };
    },
  });
  res.status(response.status);
  response.headers.forEach((v, k) => res.setHeader(k, v));
  res.send(await response.text());
});

/** Starts a Stripe checkout for Plus and returns its page. The carer's uid rides along so the webhook knows whose plan it is. */
export const checkout = onRequest({ ...OPTS, secrets: [STRIPE_KEY] }, async (req, res) => {
  const ok = allow(req.headers.origin, res);
  if (req.method === 'OPTIONS') return void res.status(ok ? 204 : 403).send('');
  if (req.method !== 'POST') return void res.status(405).send('');
  const who = await uidFrom(req.headers.authorization);
  if (!who) return void res.status(401).json({ text: 'Sign in first.' });
  if (!PRICE.value()) return void res.status(503).json({ text: 'Plus is not on sale yet.' });
  try {
    const plan = (await getFirestore().doc(`plans/${who.uid}`).get()).data() as Plan | undefined;
    const session = await stripe('checkout/sessions', {
      mode: 'subscription',
      'line_items[0][price]': PRICE.value(),
      'line_items[0][quantity]': '1',
      client_reference_id: who.uid,
      success_url: `${APP_URL}/me?plus=thanks`,
      cancel_url: `${APP_URL}/me`,
      ...(plan?.customer ? { customer: plan.customer } : who.email ? { customer_email: who.email } : {}),
    });
    res.json({ url: session['url'] });
  } catch {
    res.status(502).json({ text: 'The payment page did not open. Try again later.' });
  }
});

/** Opens Stripe's page where a carer can change their card or cancel Plus. */
export const portal = onRequest({ ...OPTS, secrets: [STRIPE_KEY] }, async (req, res) => {
  const ok = allow(req.headers.origin, res);
  if (req.method === 'OPTIONS') return void res.status(ok ? 204 : 403).send('');
  if (req.method !== 'POST') return void res.status(405).send('');
  const who = await uidFrom(req.headers.authorization);
  if (!who) return void res.status(401).json({ text: 'Sign in first.' });
  const plan = (await getFirestore().doc(`plans/${who.uid}`).get()).data() as Plan | undefined;
  if (!plan?.customer) return void res.status(404).json({ text: 'There is no payment to manage.' });
  try {
    const session = await stripe('billing_portal/sessions', { customer: plan.customer, return_url: `${APP_URL}/me` });
    res.json({ url: session['url'] });
  } catch {
    res.status(502).json({ text: 'That page did not open. Try again later.' });
  }
});

/** Stripe tells us when Plus starts, changes or ends. Only signed events are used. */
export const stripeWebhook = onRequest({ ...OPTS, secrets: [STRIPE_HOOK] }, async (req, res) => {
  const raw = req.rawBody.toString('utf8');
  if (!verifyStripeSignature(raw, req.get('stripe-signature'), STRIPE_HOOK.value(), Math.floor(Date.now() / 1000))) return void res.status(400).send('');
  const change = planChange(JSON.parse(raw), Date.now());
  const db = getFirestore();
  if (change.kind === 'by-uid') await db.doc(`plans/${change.uid}`).set(change.plan, { merge: true });
  if (change.kind === 'by-subscription') {
    const found = await db.collection('plans').where('subscription', '==', change.subscription).get();
    await Promise.all(found.docs.map((d) => d.ref.set({ active: change.active, updatedAt: Date.now() }, { merge: true })));
  }
  res.status(200).send('');
});
