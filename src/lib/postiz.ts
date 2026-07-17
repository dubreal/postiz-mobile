import { api } from './api';
import type {
  CalendarPost,
  Customer,
  Integration,
  MediaItem,
  MediaListResponse,
} from './types';

export function getIntegrations(): Promise<Integration[]> {
  return api.get<Integration[]>('/api/public/v1/integrations');
}

export function getCustomers(): Promise<Customer[]> {
  return api.get<Customer[]>('/api/public/v1/groups');
}

/**
 * Calendar posts in a date range. The API expands recurring posts into multiple
 * entries that SHARE one `id`, so we de-duplicate on the id+publishDate pair and
 * keep chronological order.
 */
export async function getCalendar(
  startISO: string,
  endISO: string,
  customer?: string,
): Promise<CalendarPost[]> {
  const q = new URLSearchParams({ startDate: startISO, endDate: endISO });
  if (customer) q.set('customer', customer);
  const { posts } = await api.get<{ posts: CalendarPost[] }>(
    `/api/public/v1/posts?${q.toString()}`,
  );
  const seen = new Set<string>();
  const unique = posts.filter((p) => {
    const key = `${p.id}@${p.publishDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.publishDate.localeCompare(b.publishDate));
  return unique;
}

export function getMedia(page = 1, search = ''): Promise<MediaListResponse> {
  const q = new URLSearchParams({ page: String(page) });
  if (search) q.set('search', search);
  return api.get<MediaListResponse>(`/api/media?${q.toString()}`);
}

// ----- Compose / schedule -----

export interface PostContentInput {
  content: string; // HTML/text caption
  image: Pick<MediaItem, 'id' | 'path'>[];
}

export interface CreatePostChannel {
  integrationId: string;
  value: PostContentInput[];
  settings: Record<string, unknown>;
}

export interface CreatePostInput {
  type: 'draft' | 'schedule' | 'now';
  dateISO: string; // UTC ISO
  channels: CreatePostChannel[];
}

/** Build the exact body Postiz's POST /public/v1/posts expects and send it. */
export function createPost(input: CreatePostInput): Promise<unknown> {
  const body = {
    type: input.type,
    date: input.dateISO,
    shortLink: false,
    tags: [] as unknown[],
    posts: input.channels.map((c) => ({
      integration: { id: c.integrationId },
      value: c.value,
      settings: c.settings,
    })),
  };
  return api.post('/api/public/v1/posts', body);
}

export function deletePost(id: string): Promise<unknown> {
  return api.del(`/api/public/v1/posts/${id}`);
}

/** Runtime settings schema for a channel (per-provider fields). */
export function getIntegrationSettings(id: string): Promise<unknown> {
  return api.get<unknown>(`/api/public/v1/integration-settings/${id}`);
}
