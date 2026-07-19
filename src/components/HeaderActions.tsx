import { StreakBadge } from './StreakBadge';
import { NotificationsBell } from './NotificationsBell';

// Top-right header cluster shown on every page. Only the mounted page renders it,
// so exactly one notifications poller runs at a time.
export function HeaderActions() {
  return (
    <div className="flex items-center gap-2.5">
      <StreakBadge />
      <NotificationsBell />
    </div>
  );
}
