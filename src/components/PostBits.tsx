import { providerLabel } from '@/lib/providers';
import { cx } from './ui';
import type { CalendarPost } from '@/lib/types';

export function ChannelAvatar({
  picture,
  identifier,
  size = 28,
}: {
  picture?: string;
  identifier: string;
  size?: number;
}) {
  const label = providerLabel(identifier);
  if (picture) {
    return (
      <img
        src={picture}
        alt={label}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full border border-newBorder object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-boxHover text-[11px] font-bold text-newTableText"
      style={{ width: size, height: size }}
      title={label}
    >
      {label.slice(0, 1)}
    </span>
  );
}

const STATE_STYLES: Record<CalendarPost['state'], string> = {
  QUEUE: 'bg-btnPrimary/15 text-btnPrimary',
  PUBLISHED: 'bg-[#3c7c5a]/20 text-[#5fbd8b]',
  ERROR: 'bg-[#ff6b6b]/15 text-[#ff6b6b]',
  DRAFT: 'bg-boxHover text-newTableText',
};

const STATE_LABEL: Record<CalendarPost['state'], string> = {
  QUEUE: 'Scheduled',
  PUBLISHED: 'Published',
  ERROR: 'Failed',
  DRAFT: 'Draft',
};

export function StateBadge({ state }: { state: CalendarPost['state'] }) {
  return (
    <span
      className={cx(
        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
        STATE_STYLES[state],
      )}
    >
      {STATE_LABEL[state]}
    </span>
  );
}
