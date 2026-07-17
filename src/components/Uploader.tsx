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

const MAX_VIDEO = 1024 * 1024 * 1024; // 1GB (Postiz limit)
const MAX_IMAGE = 30 * 1024 * 1024; // 30MB (Postiz limit)

/** Read a video's pixel dimensions locally (works even for HEVC on this device). */
function probeVideoSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (r: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(r);
    };
    v.preload = 'metadata';
    v.onloadedmetadata = () => done({ width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => done(null);
    v.src = url;
    setTimeout(() => done(null), 5000);
  });
}

export function Uploader({ onUploaded }: { onUploaded: (item: MediaItem) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uppyRef = useRef<Uppy | null>(null);
  const [progress, setProgress] = useState<Progress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const uppy = createUppy(getConfig().storageProvider, {
      onMedia: (item) => onUploaded(item),
      onError: (msg) => setError(msg),
    });

    // Show the file the moment it starts so there is always visible feedback.
    uppy.on('upload', (_id, files) => {
      setProgress((prev) => {
        const next = [...prev];
        for (const f of files ?? []) {
          if (!next.some((p) => p.name === f.name)) {
            next.push({ name: f.name ?? 'file', pct: 0 });
          }
        }
        return next;
      });
    });

    uppy.on('upload-progress', (file, prog) => {
      if (!file) return;
      const pct =
        prog.bytesTotal && prog.bytesTotal > 0
          ? Math.round((prog.bytesUploaded / prog.bytesTotal) * 100)
          : 0;
      setProgress((prev) => {
        const next = prev.filter((p) => p.name !== file.name);
        next.push({ name: file.name ?? 'file', pct: Math.min(pct, 99) });
        return next;
      });
    });

    uppy.on('upload-success', (file) => {
      setProgress((prev) => prev.filter((p) => p.name !== file?.name));
    });

    uppy.on('upload-error', (file) => {
      setProgress((prev) => prev.filter((p) => p.name !== file?.name));
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setWarning(null);
    const files = e.target.files;
    const uppy = uppyRef.current;
    if (!files || !uppy) return;

    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      // Enforce Postiz's size limits up front with a clear message.
      if (isVideo && file.size > MAX_VIDEO) {
        setError(`${file.name} is over 1 GB. Trim or compress it first.`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE) {
        setError(`${file.name} is over 30 MB. Use a smaller image.`);
        continue;
      }

      // Warn on very high resolution: 8K/4K clips (and HEVC in general) may not
      // preview on desktop or publish to every platform. Non-blocking.
      if (isVideo) {
        const dim = await probeVideoSize(file);
        if (dim && (dim.width > 1920 || dim.height > 1080)) {
          setWarning(
            `This clip is ${dim.width}×${dim.height}. Very high-resolution or HEVC video may not preview on desktop or publish to every platform. H.264 at 1080p is safest.`,
          );
        }
      }

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

      {warning && (
        <p className="rounded-[8px] bg-[#e0a030]/10 px-2.5 py-2 text-xs text-[#e0a030]">
          {warning}
        </p>
      )}
    </div>
  );
}
