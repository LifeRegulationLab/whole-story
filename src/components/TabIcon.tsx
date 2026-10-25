import type { ReactNode } from 'react';

/** Line icons for the bottom tabs, drawn in the text colour like the icons in Pace and Mull. */
const PATHS: Record<string, ReactNode> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  log: (
    <>
      <path d="M5 4h10l4 4v12H5z" /><path d="M9 12h6M9 16h6" />
    </>
  ),
  them: (
    <>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </>
  ),
  family: (
    <>
      <circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20a6 6 0 0 1 12 0M15 20a4.5 4.5 0 0 1 6.5-4" />
    </>
  ),
  papers: (
    <>
      <path d="M8 3h9l3 3v12H8z" /><path d="M4 7v14h11" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><path d="M12 17h.01" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export function TabIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
