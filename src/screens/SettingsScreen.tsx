import { useState } from 'react';
import { Moon, Sun, SignOut, ShieldCheck } from '@phosphor-icons/react';
import { useAuth } from '@/auth/AuthContext';
import { getConfig } from '@/lib/config';
import { getTheme, setTheme, type Theme } from '@/lib/theme';
import { Button, cx } from '@/components/ui';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const storage = getConfig().storageProvider;

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  }

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-bold text-newTextColor">Settings</h1>
      </header>

      <div className="rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
          Signed in as
        </p>
        <p className="mt-1 truncate text-[15px] font-medium text-newTextColor">
          {user?.email ?? 'Unknown'}
        </p>
      </div>

      <Row
        label="Appearance"
        value={theme === 'dark' ? 'Dark' : 'Light'}
        action={
          <Button variant="ghost" onClick={toggleTheme} className="h-10 min-h-0 px-3">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            Switch
          </Button>
        }
      />

      <Row
        label="Media storage"
        value={storage === 'cloudflare' ? 'Object storage (S3-compatible)' : 'Local disk'}
      />

      <div className="flex items-start gap-3 rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-btnPrimary" />
        <p className="text-xs leading-relaxed text-newTableText">
          This app talks to your Postiz server over the same origin. Your login is
          handled by Postiz; this app never stores your password or session token.
        </p>
      </div>

      <Button variant="danger" onClick={logout} className="justify-start">
        <SignOut size={18} weight="bold" /> Sign out
      </Button>
    </section>
  );
}

function Row({
  label,
  value,
  action,
}: {
  label: string;
  value: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        'flex items-center justify-between gap-3 rounded-[12px] border border-newBorder bg-newBgColorInner p-4',
      )}
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
          {label}
        </p>
        <p className="mt-1 truncate text-[15px] font-medium text-newTextColor">{value}</p>
      </div>
      {action}
    </div>
  );
}
