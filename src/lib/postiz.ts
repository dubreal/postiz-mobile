import { api, papi } from './api';
import type {
  CalendarPost,
  Customer,
  Integration,
  MediaItem,
  MediaListResponse,
} from './types';

export function getIntegrations(): Promise<Integration[]> {
  return papi.get<Integration[]>('/api/public/v1/integrations');
}

export function getCustomers(): Promise<Customer[]> {
  return papi.get<Customer[]>('/api/public/v1/groups');
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
  const { posts } = await papi.get<{ posts: CalendarPost[] }>(
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

/** Build the exact body Postiz uses for both posts and Sets. */
function buildPostBody(input: CreatePostInput) {
  return {
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
}

/** Build the post body and send it to schedule/draft. */
export function createPost(input: CreatePostInput): Promise<unknown> {
  return papi.post('/api/public/v1/posts', buildPostBody(input));
}

// ----- Sets (saved channel + content templates) -----

export interface PostizSet {
  id: string;
  name: string;
  content: string; // JSON string, same shape as a post body
}

/** Fields extracted from a Set's content to prefill the composer. */
export interface ParsedSet {
  channelIds: string[];
  caption: string;
  media: { id: string; path: string }[];
  settingsById: Record<string, Record<string, unknown>>;
}

export function getSets(): Promise<PostizSet[]> {
  return api.get<PostizSet[]>('/api/sets');
}

export function saveSet(name: string, input: CreatePostInput): Promise<unknown> {
  return api.post('/api/sets', { name, content: JSON.stringify(buildPostBody(input)) });
}

export function deleteSet(id: string): Promise<unknown> {
  return api.del(`/api/sets/${id}`);
}

export function parseSetContent(content: string): ParsedSet {
  const d = JSON.parse(content) as {
    posts?: {
      integration?: { id?: string };
      settings?: Record<string, unknown>;
      value?: { content?: string; image?: { id: string; path: string }[] }[];
    }[];
  };
  const posts = d.posts ?? [];
  const channelIds = posts.map((p) => p.integration?.id).filter(Boolean) as string[];
  const first = posts[0]?.value?.[0];
  const caption = first?.content ?? '';
  const media = (first?.image ?? []).map((m) => ({ id: m.id, path: m.path }));
  const settingsById: Record<string, Record<string, unknown>> = {};
  for (const p of posts) {
    if (p.integration?.id) settingsById[p.integration.id] = p.settings ?? {};
  }
  return { channelIds, caption, media, settingsById };
}

export function deletePost(id: string): Promise<unknown> {
  return papi.del(`/api/public/v1/posts/${id}`);
}

/** Runtime settings schema for a channel (per-provider fields). */
export function getIntegrationSettings(id: string): Promise<unknown> {
  return papi.get<unknown>(`/api/public/v1/integration-settings/${id}`);
}
