import { X } from '@phosphor-icons/react';
import { isVideo } from './MediaGrid';
import type { MediaItem } from '@/lib/types';

/** Full-screen preview of a media item: fit-to-screen image, or playable video. */
export function MediaViewer({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <X size={20} weight="bold" />
      </button>
      <div className="flex max-h-full max-w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        {isVideo(item.path) ? (
          <video
            src={item.path}
            controls
            playsInline
            autoPlay
            className="max-h-[85dvh] max-w-full rounded-[8px]"
          />
        ) : (
          <img
            src={item.path}
            alt={item.alt ?? item.name}
            className="max-h-[85dvh] max-w-full rounded-[8px] object-contain"
          />
        )}
        <p className="mt-3 max-w-full truncate text-center text-xs text-white/60">
          {item.name}
        </p>
      </div>
    </div>
  );
}
