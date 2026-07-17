import Uppy from '@uppy/core';
import AwsS3Multipart from '@uppy/aws-s3';
import XHRUpload from '@uppy/xhr-upload';
import type { MediaItem, StorageProvider } from './types';

// Ported from Postiz's own uploader
// (libraries/react-shared-libraries/src/helpers/uppy.upload.ts) so behaviour
// matches the desktop exactly. Two storage paths, chosen by the host's config:
//   - 'cloudflare' -> S3-compatible multipart, browser PUTs parts DIRECT to the
//     bucket (bypasses the proxy body cap). Works with R2, AWS S3, MinIO, etc.
//   - 'local'      -> XHR upload straight through the proxy to Postiz disk storage.
// All requests are same-origin to /api/media/* and carry the auth cookie.

const MAX_HASH_BYTES = 100 * 1024 * 1024; // skip hashing above 100MB (perf)

// SHA-256 hex via the browser's SubtleCrypto (no Node Buffer). The hash is only
// attached as optional object metadata, so an empty string is a safe fallback.
async function sha256Hex(data: Blob): Promise<string> {
  try {
    const buf = await data.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

async function mediaApi<T>(endpoint: string, data: unknown): Promise<T> {
  const res = await fetch(`/api/media/${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Surface the server's reason (e.g. rejected file type) instead of a bare code.
    throw new Error(
      `Upload ${endpoint} failed (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    );
  }
  return (await res.json()) as T;
}

export interface UppyCallbacks {
  onMedia: (item: MediaItem) => void;
  onError?: (message: string) => void;
}

export function createUppy(
  storageProvider: StorageProvider,
  { onMedia, onError }: UppyCallbacks,
): Uppy {
  const uppy = new Uppy({
    autoProceed: true,
    restrictions: { maxFileSize: 1024 * 1024 * 1024 }, // 1GB, matches Postiz
  });

  if (storageProvider === 'cloudflare') {
    uppy.use(AwsS3Multipart, {
      shouldUseMultipart: () => true,
      endpoint: '',
      createMultipartUpload: async (file: { data: Blob; type?: string }) => {
        const fileHash =
          file.data.size <= MAX_HASH_BYTES ? await sha256Hex(file.data) : '';
        return mediaApi('create-multipart-upload', {
          file,
          fileHash,
          contentType: file.type,
        });
      },
      listParts: (file: unknown, props: unknown) =>
        mediaApi('list-parts', { file, ...(props as object) }),
      signPart: (file: unknown, props: unknown) =>
        mediaApi('sign-part', { file, ...(props as object) }),
      abortMultipartUpload: (file: unknown, props: unknown) =>
        mediaApi('abort-multipart-upload', { file, ...(props as object) }),
      completeMultipartUpload: async (file: unknown, props: unknown) => {
        const body = await mediaApi<{ Location: string; saved?: MediaItem }>(
          'complete-multipart-upload',
          { file, ...(props as object) },
        );
        if (body.saved) onMedia(body.saved);
        return { location: body.Location };
      },
    } as never);
  } else {
    uppy.use(XHRUpload, {
      endpoint: '/api/media/upload-server',
      withCredentials: true,
      fieldName: 'file',
    });
    uppy.on('upload-success', (_file, response) => {
      const item = response?.body as MediaItem | undefined;
      if (item?.id && item?.path) onMedia(item);
    });
  }

  uppy.on('upload-error', (_file, err) => {
    onError?.(err?.message ?? 'Upload failed.');
  });

  return uppy;
}
