import { Check } from '@phosphor-icons/react';
import { cx } from './ui';
import type { MediaItem } from '@/lib/types';

export function isVideo(path: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(path);
}

export function MediaThumb({ item }: { item: MediaItem }) {
  if (isVideo(item.path)) {
    return (
      <video
        src={`${item.path}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    );
  }
  return (
    <img
      src={item.path}
      alt={item.alt ?? item.name}
      loading="lazy"
      className="h-full w-full object-cover"
    />
  );
}

export function MediaGrid({
  items,
  selectedIds,
  onToggle,
}: {
  items: MediaItem[];
  selectedIds?: Set<string>;
  onToggle?: (item: MediaItem) => void;
}) {
  const selectable = !!onToggle;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const selected = selectedIds?.has(item.id) ?? false;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={selectable ? () => onToggle?.(item) : undefined}
              className={cx(
                'relative aspect-square w-full overflow-hidden rounded-[10px] border bg-newBgColorInner',
                selected ? 'border-btnPrimary ring-2 ring-btnPrimary/50' : 'border-newBorder',
                selectable ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <MediaThumb item={item} />
              {isVideo(item.path) && !selected && (
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                  VIDEO
                </span>
              )}
              {selectable && selected && (
                <span className="absolute inset-0 flex items-center justify-center bg-btnPrimary/30">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-btnPrimary text-white">
                    <Check size={16} weight="bold" />
                  </span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
