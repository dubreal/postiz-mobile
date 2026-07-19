import { useCallback, useEffect, useState } from 'react';
import { Images } from '@phosphor-icons/react';
import { getMedia, deleteMedia } from '@/lib/postiz';
import { EmptyState, ErrorState, Skeleton, ConfirmModal } from '@/components/ui';
import { Uploader } from '@/components/Uploader';
import { MediaGrid } from '@/components/MediaGrid';
import { MediaViewer } from '@/components/MediaViewer';
import { HeaderActions } from '@/components/HeaderActions';
import { friendlyError } from '@/lib/errors';
import type { MediaItem } from '@/lib/types';

export function MediaScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<MediaItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMedia(1);
      setItems(res.results ?? []);
    } catch (err) {
      setError(friendlyError(err, 'Could not load media.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onUploaded = useCallback((item: MediaItem) => {
    setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
  }, []);

  async function confirmDelete() {
    if (!deletingItem) return;
    const id = deletingItem.id;
    setDeleteError(null);
    try {
      await deleteMedia(id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      setDeletingItem(null);
    } catch (err) {
      setDeleteError(friendlyError(err, 'Could not delete.'));
    }
  }

  return (
    <section>
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-newTextColor">Media</h1>
        <HeaderActions />
      </header>

      <div className="mb-5">
        <Uploader onUploaded={onUploaded} />
      </div>

      {loading && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Images size={40} />}
          title="No media yet"
          hint="Upload photos or videos to use them in your posts."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <MediaGrid items={items} onView={setViewing} onDelete={setDeletingItem} />
      )}

      {viewing && <MediaViewer item={viewing} onClose={() => setViewing(null)} />}

      {deletingItem && (
        <ConfirmModal
          title="Delete media?"
          message={
            deleteError ??
            'This removes the file from your Postiz media library. This cannot be undone.'
          }
          confirmLabel="Delete"
          cancelLabel="Keep"
          danger
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeletingItem(null);
            setDeleteError(null);
          }}
        />
      )}
    </section>
  );
}
