// Shapes returned by the host's Postiz API (v2.21.x). Only the fields this app
// uses are typed; unknown extras are ignored.

export interface SelfUser {
  id: string;
  email: string;
  name?: string | null;
  // Present only for org admins; we never send it anywhere. Existence => authed.
  publicApi?: string;
}

export interface Integration {
  id: string;
  name: string;
  /** provider slug, e.g. 'youtube' | 'tiktok' | 'instagram-standalone' | 'discord' */
  identifier: string;
  picture: string;
  disabled: boolean;
  profile?: string;
  customer?: { id: string; name: string };
}

export interface Customer {
  id: string;
  name: string;
}

/** One post as returned by GET /api/public/v1/posts (calendar range). */
export interface CalendarPost {
  id: string;
  content: string; // HTML
  publishDate: string; // UTC ISO
  releaseURL: string | null;
  releaseId: string | null;
  state: 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
  intervalInDays: number | null;
  group: string;
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture: string;
  };
  /** Present only on expanded recurring instances; original date. */
  actualDate?: string;
}

/** A media library row (GET /api/media) and the shape returned by uploads. */
export interface MediaItem {
  id: string;
  name: string;
  path: string; // full public URL
  thumbnail?: string | null;
  alt?: string | null;
  type?: string;
}

export interface MediaListResponse {
  pages: number;
  results: MediaItem[];
}

/** Storage backend the host runs; mirrors Postiz's STORAGE_PROVIDER. */
export type StorageProvider = 'local' | 'cloudflare';
