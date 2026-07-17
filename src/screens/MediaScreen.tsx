import { useCallback, useEffect, useState } from 'react';
import { Images } from '@phosphor-icons/react';
import { getMedia } from '@/lib/postiz';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { Uploader } from '@/components/Uploader';
import { MediaGrid } from '@/components/MediaGrid';
import { ApiError } from '@/lib/api';
import type { MediaItem } from '@/lib/types';

export function MediaScreen() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMedia(1);
      setItems(res.results ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load media.');
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

  return (
    <section>
      <header className="mb-5">
        <h1 className="text-xl font-bold text-newTextColor">Media</h1>
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

      {!loading && !error && items.length > 0 && <MediaGrid items={items} />}
    </section>
  );
}
