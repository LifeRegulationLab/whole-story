import { firebase, firebaseConfigured } from '../firebase/app';
import { CANNOT_ANSWER, checkReply, gate } from './safety';

/**
 * The Ask helper. It is off unless the build turns it on and the carer switches it on in Me.
 * It sends only the question and the short context the carer ticks, never the whole log.
 */

const env = import.meta.env;

export function helperAvailable(): boolean {
  return env['VITE_HELPER_ON'] === 'true' && Boolean(env['VITE_HELPER_URL']) && firebaseConfigured();
}

export interface Turn {
  role: 'carer' | 'helper';
  text: string;
  support?: boolean;
}

export async function ask(question: string, context: string[], history: Turn[]): Promise<Turn> {
  const g = gate(question);
  if (!g.send) return { role: 'helper', text: g.reply, support: g.support };
  const user = firebase().auth.currentUser;
  if (!user) return { role: 'helper', text: 'Sign in to use the helper.' };
  const token = await user.getIdToken();
  try {
    const res = await fetch(String(env['VITE_HELPER_URL']), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ question, context, history: history.slice(-6) }),
    });
    if (!res.ok) return { role: 'helper', text: CANNOT_ANSWER };
    const body = (await res.json()) as { text?: string; support?: boolean };
    if (body.support) return { role: 'helper', text: body.text ?? '', support: true };
    const checked = checkReply(body.text ?? '');
    return { role: 'helper', text: checked.ok ? checked.text : CANNOT_ANSWER };
  } catch {
    return { role: 'helper', text: 'No signal. The Now cards and Help work without one.' };
  }
}
