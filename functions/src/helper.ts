import { CANNOT_ANSWER, checkReply, distressCheck, gate, SUPPORT_TEXT } from './safety';

/**
 * The Ask helper's server. It is a plain function of a web Request so it can be tested without
 * Firebase. In order: the switch, the sign-in, the request's shape, the safety gate on every
 * message from the carer (the model is not called if it catches one), the model, the reply check.
 * Nothing is stored.
 */

export const SYSTEM = [
  'You answer questions from unpaid family carers in the UK, Channel Islands and Isle of Man about caring for someone they love: dementia, learning disability, autism, mental health, frailty.',
  'Write in plain British English, short sentences, adult to adult. No exclamation marks, no cheerleading, no therapy language, no "journey".',
  'You give practical, everyday ideas and explain services, rights, assessments, benefits forms and who to ask. Say which organisation to contact when that is the real answer.',
  'Never give doses, never suggest starting, stopping or changing a medicine, never diagnose, never name a stage or condition the person might have. Say "ask the GP or pharmacist" instead.',
  'If anyone may be in danger, say to call 999. If the carer may be in crisis, give Samaritans 116 123.',
  'Never claim to be a person or a professional. Keep answers under 200 words.',
].join('\n');

export interface HelperDeps {
  on: string | undefined;
  origins: readonly string[];
  verifyUser: (token: string) => Promise<string | undefined>;
  model: (system: string, messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<{ text: string; refused: boolean }>;
}

interface HelperRequest {
  question: string;
  context: string[];
  history: { role: 'carer' | 'helper'; text: string }[];
}

export function readRequest(body: unknown): HelperRequest | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const b = body as Record<string, unknown>;
  if (typeof b['question'] !== 'string' || b['question'].length === 0 || b['question'].length > 2000) return undefined;
  const context = Array.isArray(b['context']) ? b['context'].filter((c): c is string => typeof c === 'string').slice(0, 5).map((c) => c.slice(0, 1500)) : [];
  const history = Array.isArray(b['history'])
    ? b['history']
        .filter((h): h is { role: 'carer' | 'helper'; text: string } => typeof h === 'object' && h !== null && (h.role === 'carer' || h.role === 'helper') && typeof h.text === 'string')
        .slice(-6)
        .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }))
    : [];
  return { question: b['question'], context, history };
}

function cors(request: Request, origins: readonly string[]): Record<string, string> {
  const origin = request.headers.get('origin');
  if (origin === null || !origins.includes(origin)) return {};
  return { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' };
}

export async function handleHelper(request: Request, deps: HelperDeps): Promise<Response> {
  const send = (status: number, body: { text: string; support?: boolean }) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(request, deps.origins) } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(request, deps.origins) });
  if (deps.on !== 'true') return send(503, { text: 'The helper is not switched on.' });
  if (request.method !== 'POST') return send(405, { text: CANNOT_ANSWER });

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const uid = token ? await deps.verifyUser(token) : undefined;
  if (!uid) return send(401, { text: 'Sign in to use the helper.' });

  let parsed: HelperRequest | undefined;
  try {
    parsed = readRequest(await request.json());
  } catch {
    parsed = undefined;
  }
  if (!parsed) return send(400, { text: CANNOT_ANSWER });

  if (parsed.history.some((h) => h.role === 'carer' && distressCheck(h.text))) return send(200, { text: SUPPORT_TEXT, support: true });
  const g = gate(parsed.question);
  if (!g.send) return send(200, { text: g.reply, support: g.support });

  const messages = [
    ...parsed.history.map((h) => ({ role: h.role === 'carer' ? ('user' as const) : ('assistant' as const), content: h.text })),
    { role: 'user' as const, content: parsed.context.length ? `What I have shared:\n${parsed.context.join('\n')}\n\nMy question: ${parsed.question}` : parsed.question },
  ];
  try {
    const r = await deps.model(SYSTEM, messages);
    if (r.refused) return send(200, { text: CANNOT_ANSWER });
    const checked = checkReply(r.text);
    return send(200, { text: checked.ok ? checked.text : CANNOT_ANSWER });
  } catch {
    return send(502, { text: 'The helper is not available just now. Try again later.' });
  }
}
