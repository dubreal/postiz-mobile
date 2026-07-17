import { Check, MagnifyingGlassPlus, X } from '@phosphor-icons/react';
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
  onView,
  onDelete,
}: {
  items: MediaItem[];
  selectedIds?: Set<string>;
  onToggle?: (item: MediaItem) => void;
  onView?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
}) {
  const selectable = !!onToggle;
  // Primary tap: select in picker mode, otherwise open the viewer.
  const primary = (item: MediaItem) => (selectable ? onToggle?.(item) : onView?.(item));
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item) => {
        const selected = selectedIds?.has(item.id) ?? false;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => primary(item)}
              className={cx(
                'relative aspect-square w-full overflow-hidden rounded-[10px] border bg-newBgColorInner',
                selected ? 'border-btnPrimary ring-2 ring-btnPrimary/50' : 'border-newBorder',
              )}
            >
              <MediaThumb item={item} />
              {isVideo(item.path) && !selected && (
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
                  VIDEO
                </span>
              )}

              {/* View (full frame) — shown in picker mode so tapping-to-select still leaves a way to preview */}
              {selectable && onView && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(item);
                  }}
                  aria-label="View full frame"
                  className="absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <MagnifyingGlassPlus size={13} weight="bold" />
                </span>
              )}

              {/* Delete (red X) */}
              {onDelete && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item);
                  }}
                  aria-label="Delete media"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#ff4d4d] text-white"
                >
                  <X size={13} weight="bold" />
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
