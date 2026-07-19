import { Flame } from '@phosphor-icons/react';
import { useAuth } from '@/auth/AuthContext';

// Posting streak, shown top-right on every page. Days are counted from the
// org's streakSince date (same formula as the Postiz desktop). Hidden when there
// is no active streak.
export function StreakBadge() {
  const { user } = useAuth();
  const since = user?.streakSince;
  if (!since) return null;

  const diffDays = Math.floor((Date.now() - new Date(since).getTime()) / 86400000);
  const days = Math.max(1, diffDays + 1);

  return (
    <span
      className="flex shrink-0 items-center gap-1 text-[15px] font-bold text-[#f97316]"
      title={days === 1 ? 'Posting streak started today' : `${days}-day posting streak`}
      aria-label={`${days} day posting streak`}
    >
      <Flame size={18} weight="fill" />
      {days}
    </span>
  );
}
