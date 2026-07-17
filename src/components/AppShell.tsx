import { NavLink, Outlet } from 'react-router-dom';
import {
  CalendarBlank,
  Images,
  PlusCircle,
  GearSix,
  type Icon,
} from '@phosphor-icons/react';
import { cx } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Calendar', icon: CalendarBlank, end: true },
  { to: '/compose', label: 'Compose', icon: PlusCircle },
  { to: '/media', label: 'Media', icon: Images },
  { to: '/settings', label: 'Settings', icon: GearSix },
];

export function AppShell() {
  return (
    <div className="min-h-[100dvh] bg-newBgColor md:flex">
      {/* Desktop / tablet: left sidebar */}
      <aside className="sticky top-0 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-newBorder bg-newBgColorInner px-3 py-5 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <span className="text-lg font-extrabold tracking-tight text-newTextColor">
            Postiz
          </span>
          <span className="rounded bg-btnPrimary/15 px-1.5 py-0.5 text-[11px] font-semibold text-btnPrimary">
            mobile
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top header (desktop uses the sidebar brand) */}
        <header
          className="sticky top-0 z-30 flex items-center justify-center border-b border-newBorder bg-newBgColorInner/95 py-3 backdrop-blur md:hidden"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <span className="text-[15px] font-extrabold tracking-tight">
            <span className="text-newTextColor">Postiz</span>{' '}
            <span className="text-btnPrimary">Mobile</span>
          </span>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-4 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Phone: bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-newBorder bg-newBgColorInner/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        {NAV.map((item) => (
          <TabLink key={item.to} item={item} />
        ))}
      </nav>
    </div>
  );
}

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors',
          isActive
            ? 'bg-btnPrimary/15 text-btnPrimary'
            : 'text-newTableText hover:bg-boxHover hover:text-newTextColor',
        )
      }
    >
      <Icon size={20} weight="regular" />
      {item.label}
    </NavLink>
  );
}

function TabLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cx(
          'flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium',
          'min-h-[56px]',
          isActive ? 'text-btnPrimary' : 'text-newTableText',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={23} weight={isActive ? 'fill' : 'regular'} />
          {item.label}
        </>
      )}
    </NavLink>
  );
}
