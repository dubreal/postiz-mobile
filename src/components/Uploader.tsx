import { useEffect, useRef, useState } from 'react';
import type Uppy from '@uppy/core';
import { UploadSimple } from '@phosphor-icons/react';
import { createUppy } from '@/lib/upload';
import { getConfig } from '@/lib/config';
import { Button } from './ui';
import type { MediaItem } from '@/lib/types';

interface Progress {
  name: string;
  pct: number;
}

export function Uploader({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uppyRef = useRef<Uppy | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const uppy = createUppy(getConfig().storageProvider, {
      onMedia: (item) => onUploaded(item),
      onError: (msg) => setError(msg),
    });

    uppy.on('upload-progress', (file, prog) => {
      if (!file) return;
      const pct =
        prog.bytesTotal && prog.bytesTotal > 0
          ? Math.round((prog.bytesUploaded / prog.bytesTotal) * 100)
          : 0;
      setProgress((prev) => {
        const next = prev.filter((p) => p.name !== file.name);
        if (pct < 100) next.push({ name: file.name ?? 'file', pct });
        return next;
      });
    });

    uppy.on('upload-success', (file) => {
      setProgress((prev) => prev.filter((p) => p.name !== file?.name));
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = e.target.files;
    const uppy = uppyRef.current;
    if (!files || !uppy) return;
    for (const file of Array.from(files)) {
      try {
        uppy.addFile({ name: file.name, type: file.type, data: file });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add file.');
      }
    }
    e.target.value = '';
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4"
        multiple
        onChange={onPick}
        className="hidden"
      />
      <Button variant="ghost" onClick={() => inputRef.current?.click()}>
        <UploadSimple size={18} weight="bold" /> Upload media
      </Button>

      {progress.map((p) => (
        <div key={p.name} className="rounded-[10px] bg-newBgColorInner p-2.5">
          <div className="mb-1 flex justify-between text-xs text-newTableText">
            <span className="truncate">{p.name}</span>
            <span>{p.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-boxHover">
            <div
              className="h-full rounded-full bg-btnPrimary transition-[width] duration-200"
              style={{ width: `${p.pct}%` }}
            />
          </div>
        </div>
      ))}

      {error && (
        <p role="alert" className="text-xs text-[#ff6b6b]">
          {error}
        </p>
      )}
    </div>
  );
}
