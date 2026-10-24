import { useState } from 'react';

/** The time now. Kept in one place so screens read it once and tests can reason about it. */
export function now(): number {
  return Date.now();
}

/** The time when the screen opened. Screens use it for "today" and "the last four weeks". */
export function useNow(): number {
  const [t] = useState(now);
  return t;
}
