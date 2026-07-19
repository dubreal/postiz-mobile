import { useEffect, useState } from 'react';
import { Moon, Sun, SignOut, ShieldCheck, GithubLogo } from '@phosphor-icons/react';
import { useAuth } from '@/auth/AuthContext';
import { getConfig } from '@/lib/config';
import { getTheme, setTheme, type Theme } from '@/lib/theme';
import {
  getShortlinkPref,
  setShortlinkPref,
  getEmailNotifications,
  updateEmailNotifications,
  type ShortlinkPref,
  type EmailNotifications,
} from '@/lib/postiz';
import { friendlyError } from '@/lib/errors';
import { Button, ErrorBanner, Select, cx } from '@/components/ui';
import { SetsManager } from '@/components/SetsManager';
import { SignaturesManager } from '@/components/SignaturesManager';

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

      <ShortlinkSetting />

      <NotificationSettings />

      <div className="rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
        <SetsManager />
      </div>

      <div className="rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
        <SignaturesManager />
      </div>

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

      {/* AGPL-3.0 (§13): offer the running app's source to its users. */}
      <a
        href="https://github.com/dubreal/postiz-mobile"
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 flex items-center justify-center gap-1.5 text-xs text-newTableText hover:text-newTextColor"
      >
        <GithubLogo size={14} weight="bold" /> Source code (AGPL-3.0)
      </a>
    </section>
  );
}

const NOTIFY_FIELDS: { key: keyof EmailNotifications; label: string }[] = [
  { key: 'sendSuccessEmails', label: 'When a post publishes' },
  { key: 'sendFailureEmails', label: 'When a post fails' },
  { key: 'sendStreakEmails', label: 'Posting streak reminders' },
];

function NotificationSettings() {
  const [prefs, setPrefs] = useState<EmailNotifications | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getEmailNotifications()
      .then(setPrefs)
      .catch(() => setError('Could not load notification settings.'));
  }, []);

  async function toggle(key: keyof EmailNotifications, value: boolean) {
    if (!prefs) return;
    const prev = prefs;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    setError(null);
    try {
      await updateEmailNotifications(next); // API needs all three flags
    } catch (err) {
      setPrefs(prev);
      setError(friendlyError(err, 'Could not update notification settings.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
        Email notifications
      </p>
      {NOTIFY_FIELDS.map((f) => (
        <label key={f.key} className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-newTextColor">{f.label}</span>
          <input
            type="checkbox"
            checked={prefs?.[f.key] ?? false}
            disabled={prefs === null || saving}
            onChange={(e) => toggle(f.key, e.target.checked)}
            className="h-5 w-5 shrink-0 accent-btnPrimary disabled:opacity-50"
          />
        </label>
      ))}
      {error && <ErrorBanner message={error} />}
    </div>
  );
}

function ShortlinkSetting() {
  const [pref, setPref] = useState<ShortlinkPref | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getShortlinkPref()
      .then(setPref)
      .catch(() => setError('Could not load the short-link setting.'));
  }, []);

  async function change(next: ShortlinkPref) {
    const prev = pref;
    setPref(next);
    setSaving(true);
    setError(null);
    try {
      await setShortlinkPref(next);
    } catch (err) {
      setPref(prev);
      setError(friendlyError(err, 'Could not update the short-link setting.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-newBorder bg-newBgColorInner p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-newTableText">
            Short links
          </p>
          <p className="mt-1 text-[13px] text-newTableText">
            Shorten links in your posts.
          </p>
        </div>
        <Select
          value={pref ?? 'ASK'}
          disabled={pref === null || saving}
          onChange={(e) => change(e.target.value as ShortlinkPref)}
          wrapperClassName="w-[132px] shrink-0"
        >
          <option value="ASK">Ask each time</option>
          <option value="YES">Always</option>
          <option value="NO">Never</option>
        </Select>
      </div>
      {error && <ErrorBanner message={error} />}
    </div>
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
