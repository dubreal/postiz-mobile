import { useState, type FormEvent } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';

export function LoginScreen() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // The form element is handed straight to the auth layer, which reads the
      // password from it only at submit time and never retains it.
      await login(e.currentTarget);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Wrong email or password.');
      } else if (err instanceof ApiError && err.status === 0) {
        setError('Cannot reach the server. Check your connection.');
      } else {
        setError('Login failed. Please try again.');
      }
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-newBgColor px-5">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-2">
            {/* Matches the app header brand, at 2x scale (header is text-[15px]). */}
            <span className="text-[30px] font-extrabold tracking-tight">
              <span className="text-newTextColor">Postiz</span>{' '}
              <span className="text-btnPrimary">Mobile</span>
            </span>
          </div>
          <p className="text-sm text-newTableText">
            Sign in with your Postiz account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-newTextColor">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              className="min-h-[46px] rounded-[10px] border border-newBorder bg-newBgColorInner px-3.5 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-newTextColor">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-[46px] rounded-[10px] border border-newBorder bg-newBgColorInner px-3.5 text-[16px] text-newTextColor placeholder:text-newTableText focus:border-btnPrimary focus:outline-none focus:ring-2 focus:ring-btnPrimary/40"
              placeholder="Your password"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-[10px] bg-[#ff6b6b]/10 px-3 py-2 text-sm text-[#ff6b6b]"
            >
              {error}
            </p>
          )}

          <Button type="submit" loading={busy} className="mt-1 w-full">
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-newTableText">
          Your password goes straight to your Postiz server over HTTPS and is
          never stored by this app.
        </p>
      </div>
    </div>
  );
}
