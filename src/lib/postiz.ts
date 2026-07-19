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

export function deleteMedia(id: string): Promise<unknown> {
  return api.del(`/api/media/${id}`);
}

// ----- Compose / schedule -----

export interface PostContentInput {
  content: string; // HTML/text caption
  image: Pick<MediaItem, 'id' | 'path'>[];
  id?: string; // existing Post row id — set ONLY when updating, to edit in place
}

export interface CreatePostChannel {
  integrationId: string;
  value: PostContentInput[];
  settings: Record<string, unknown>;
}

export interface CreatePostInput {
  type: 'draft' | 'schedule' | 'now' | 'update';
  dateISO: string; // UTC ISO
  channels: CreatePostChannel[];
}

/** Full data for editing an existing post (fetched from the private API). */
export interface EditPostData {
  postId: string; // the Post row id — becomes value[].id so the update edits in place
  integrationId: string;
  content: string; // HTML
  image: { id: string; path: string }[];
  settings: Record<string, unknown>;
  publishDate: string; // ISO
}

export async function getPostForEdit(id: string): Promise<EditPostData> {
  const raw = await api.get<{
    group: string;
    integration: string;
    settings: Record<string, unknown>;
    posts: {
      id: string;
      content: string;
      publishDate: string;
      integrationId: string;
      settings?: string;
      image?: { id: string; path: string }[];
    }[];
  }>(`/api/posts/${id}`);
  const p = raw.posts?.[0];
  if (!p) throw new Error('Post not found.');
  return {
    postId: p.id,
    integrationId: raw.integration ?? p.integrationId,
    content: p.content ?? '',
    image: (p.image ?? []).map((m) => ({ id: m.id, path: m.path })),
    settings: raw.settings ?? {},
    publishDate: p.publishDate,
  };
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

/** One entry per channel; postId is that channel's root post. */
export interface CreatedPostRef {
  postId: string;
  integration: string;
}

/** Build the post body and send it to schedule/draft. */
export function createPost(input: CreatePostInput): Promise<CreatedPostRef[]> {
  return papi.post('/api/public/v1/posts', buildPostBody(input)) as Promise<
    CreatedPostRef[]
  >;
}

// Postiz skips startWorkflow for type:'update' (posts.service.ts), so editing a
// post's time updates publishDate while the Temporal timer keeps firing at the
// ORIGINAL time. This endpoint -- what the desktop calendar's drag-to-reschedule
// calls -- runs startWorkflow, which terminates the stale workflow and starts a
// fresh one off the new date. Must be called per channel root post.
export function reschedulePost(postId: string, dateISO: string): Promise<unknown> {
  return api.put(`/api/posts/${postId}/date`, {
    date: dateISO,
    action: 'schedule',
  });
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

/** Saved drafts (posts in the DRAFT state), newest first, over a wide window. */
export async function getDrafts(): Promise<CalendarPost[]> {
  const year = 365 * 24 * 60 * 60 * 1000;
  const start = new Date(Date.now() - year).toISOString();
  const end = new Date(Date.now() + year).toISOString();
  const posts = await getCalendar(start, end);
  return posts.filter((p) => p.state === 'DRAFT').reverse();
}

export function saveSet(name: string, input: CreatePostInput): Promise<unknown> {
  return api.post('/api/sets', { name, content: JSON.stringify(buildPostBody(input)) });
}

/** Content for an empty Set (parses cleanly, applies as a blank compose). */
export const BLANK_SET_CONTENT = JSON.stringify({ posts: [] });

/** Create a Set from raw content (blank, or a copy of another Set). */
export function createRawSet(name: string, content: string): Promise<unknown> {
  return api.post('/api/sets', { name, content });
}

/** Rename / update a Set in place (PUT upserts by id in Postiz). */
export function updateSet(id: string, name: string, content: string): Promise<unknown> {
  return api.put('/api/sets', { id, name, content });
}

export function deleteSet(id: string): Promise<unknown> {
  return api.del(`/api/sets/${id}`);
}

// ----- Signatures (reusable text you can append to a post) -----

export interface Signature {
  id: string;
  content: string; // may be HTML from the desktop editor
  autoAdd: boolean; // the org's default signature (only one can be true)
}

export function getSignatures(): Promise<Signature[]> {
  return api.get<Signature[]>('/api/signatures');
}

export function createSignature(content: string, autoAdd: boolean): Promise<{ id: string }> {
  return api.post('/api/signatures', { content, autoAdd });
}

export function updateSignature(
  id: string,
  content: string,
  autoAdd: boolean,
): Promise<{ id: string }> {
  return api.put(`/api/signatures/${id}`, { content, autoAdd });
}

export function deleteSignature(id: string): Promise<unknown> {
  return api.del(`/api/signatures/${id}`);
}

// ----- Org settings relevant to posting -----

export type ShortlinkPref = 'ASK' | 'YES' | 'NO';

/** Whether links in posts get shortened: ASK per-post, always (YES), never (NO). */
export async function getShortlinkPref(): Promise<ShortlinkPref> {
  const r = await api.get<{ shortlink?: string }>('/api/settings/shortlink');
  return r?.shortlink === 'YES' || r?.shortlink === 'NO' ? r.shortlink : 'ASK';
}

export function setShortlinkPref(shortlink: ShortlinkPref): Promise<unknown> {
  return api.post('/api/settings/shortlink', { shortlink });
}

// ----- Email notification preferences (per user) -----

export interface EmailNotifications {
  sendSuccessEmails: boolean; // email when a post publishes
  sendFailureEmails: boolean; // email when a post fails
  sendStreakEmails: boolean; // posting-streak emails
}

export function getEmailNotifications(): Promise<EmailNotifications> {
  return api.get<EmailNotifications>('/api/user/email-notifications');
}

/** POST replaces all three flags at once (the API requires the full object). */
export function updateEmailNotifications(prefs: EmailNotifications): Promise<unknown> {
  return api.post('/api/user/email-notifications', { ...prefs });
}

// ----- In-app notifications -----

export interface NotificationItem {
  createdAt: string; // UTC ISO
  content: string; // may be HTML
}

/** Unread count (notifications newer than the user's last read time). */
export function getNotificationCount(): Promise<{ total: number }> {
  return api.get<{ total: number }>('/api/notifications');
}

/**
 * Latest 10 notifications, newest first. Side effect on the server: this marks
 * everything as read (advances the user's lastReadNotifications to now).
 */
export function getNotifications(): Promise<{ notifications: NotificationItem[] }> {
  return api.get<{ notifications: NotificationItem[] }>('/api/notifications/list');
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
