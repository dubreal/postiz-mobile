import { useCallback, useEffect, useState } from 'react';
import { getMedia } from '@/lib/postiz';
import { Spinner, ErrorState } from './ui';
import { Uploader } from './Uploader';
import { MediaGrid } from './MediaGrid';
import { ApiError } from '@/lib/api';
import type { MediaItem } from '@/lib/types';

export function MediaPicker({
  selected,
  onChange,
}: {
  selected: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = new Set(selected.map((s) => s.id));

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

  const toggle = useCallback(
    (item: MediaItem) => {
      if (selectedIds.has(item.id)) {
        onChange(selected.filter((s) => s.id !== item.id));
      } else {
        onChange([...selected, item]);
      }
    },
    [selected, selectedIds, onChange],
  );

  const onUploaded = useCallback(
    (item: MediaItem) => {
      setItems((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
      onChange([...selected, item]); // auto-select the freshly uploaded file
    },
    [selected, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <Uploader onUploaded={onUploaded} />
      {loading && <Spinner />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && (
        <p className="py-4 text-center text-sm text-newTableText">
          No media yet. Upload something above.
        </p>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="max-h-72 overflow-y-auto rounded-[10px] border border-newBorder p-2">
          <MediaGrid items={items} selectedIds={selectedIds} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}
