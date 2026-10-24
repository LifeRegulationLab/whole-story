import { NavLink, Outlet, Link } from 'react-router';

const TABS = [
  { to: '/', label: 'Today', end: true },
  { to: '/log', label: 'Log' },
  { to: '/them', label: 'Them' },
  { to: '/family', label: 'Family' },
  { to: '/papers', label: 'Papers' },
  { to: '/help', label: 'Help' },
  { to: '/me', label: 'Me' },
] as const;

/** Bottom tabs, and the Now button on every screen so help is one tap away. */
export function Layout() {
  return (
    <div className="min-h-dvh">
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
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
