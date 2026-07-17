import {
  DiscordLogo,
  FacebookLogo,
  InstagramLogo,
  LinkedinLogo,
  TiktokLogo,
  XLogo,
  YoutubeLogo,
  type Icon,
} from '@phosphor-icons/react';
import { providerLabel } from '@/lib/providers';
import { cx } from './ui';
import type { CalendarPost } from '@/lib/types';

// Platform badge: brand logo + brand color, shown as a corner overlay like Postiz.
const PLATFORM_BADGE: Record<string, { icon: Icon; bg: string }> = {
  youtube: { icon: YoutubeLogo, bg: '#FF0000' },
  tiktok: { icon: TiktokLogo, bg: '#010101' },
  instagram: { icon: InstagramLogo, bg: '#E4405F' },
  'instagram-standalone': { icon: InstagramLogo, bg: '#E4405F' },
  discord: { icon: DiscordLogo, bg: '#5865F2' },
  facebook: { icon: FacebookLogo, bg: '#1877F2' },
  linkedin: { icon: LinkedinLogo, bg: '#0A66C2' },
  x: { icon: XLogo, bg: '#010101' },
};

export function ChannelAvatar({
  picture,
  identifier,
  size = 28,
  badge = true,
}: {
  picture?: string;
  identifier: string;
  size?: number;
  badge?: boolean;
}) {
  const label = providerLabel(identifier);
  const platform = PLATFORM_BADGE[identifier];
  // Badge diameter scales with the avatar; icon sits inside it.
  const badgeSize = Math.max(12, Math.round(size * 0.42));

  const isRealPicture = picture && !picture.includes('no-picture');

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      {isRealPicture ? (
        <img
          src={picture}
          alt={label}
          loading="lazy"
          className="rounded-full border border-newBorder object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full bg-boxHover text-[11px] font-bold text-newTableText"
          style={{ width: size, height: size }}
          title={label}
        >
          {label.slice(0, 1)}
        </span>
      )}
      {badge && platform && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-newBgColorInner"
          style={{ width: badgeSize, height: badgeSize, background: platform.bg }}
          title={label}
        >
          <platform.icon
            size={Math.round(badgeSize * 0.68)}
            weight="fill"
            color="#ffffff"
          />
        </span>
      )}
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
