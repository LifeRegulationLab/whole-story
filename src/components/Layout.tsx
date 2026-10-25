import { NavLink, Outlet, Link } from 'react-router';
import { firebaseConfigured } from '../lib/firebase/app';
import { useStore } from '../lib/store/StoreProvider';
import { TabIcon } from './TabIcon';

const TABS = [
  { to: '/', icon: 'today', label: 'Today', end: true },
  { to: '/log', icon: 'log', label: 'Log' },
  { to: '/them', icon: 'them', label: 'Them' },
  { to: '/family', icon: 'family', label: 'Family' },
  { to: '/papers', icon: 'papers', label: 'Papers' },
  { to: '/help', icon: 'help', label: 'Help' },
  { to: '/me', icon: 'me', label: 'Me' },
] as const;

/** Bottom tabs, and the Now button on every screen so help is one tap away. */
export function Layout() {
  const { user } = useStore();
  return (
    <div className="min-h-dvh">
      {!user && firebaseConfigured() && import.meta.env['VITE_SHOWCASE'] !== 'true' ? (
        <div className="bg-[var(--panel)] px-4 py-2 pr-24 text-sm">
          You are looking around.{' '}
          <Link to="/start" className="underline">
            Make an account
          </Link>{' '}
          to keep what you write and share it with family.
        </div>
      ) : null}
      <Link
        to="/now"
        className="btn btn-accent fixed right-4 z-20 shadow-lg"
        style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
        aria-label="Now: what to try right now"
      >
        Now
      </Link>
      <Outlet />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--line)] bg-[var(--panel)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto flex max-w-2xl">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={'end' in t} className="tab">
              <TabIcon name={t.icon} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
