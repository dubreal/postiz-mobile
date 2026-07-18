// Per-provider display metadata and DEFAULT post settings that satisfy Postiz's
// server-side validation (DTOs in libraries/.../providers-settings). Only the
// providers we can post to sensibly are given rich defaults; others fall back to
// an empty object and rely on the channel accepting it.
//
// Settings shapes verified against Postiz v2.21.9 DTOs.

export interface ProviderMeta {
  label: string;
  /** Tailwind token class for a brand-ish accent chip background. */
  chip: string;
}

export const PROVIDER_META: Record<string, ProviderMeta> = {
  youtube: { label: 'YouTube', chip: 'bg-bgYoutube' },
  tiktok: { label: 'TikTok', chip: 'bg-bgTiktokItem' },
  'instagram-standalone': { label: 'Instagram', chip: 'bg-bgInstagram' },
  instagram: { label: 'Instagram', chip: 'bg-bgInstagram' },
  discord: { label: 'Discord', chip: 'bg-[#5865F2]' },
  facebook: { label: 'Facebook', chip: 'bg-bgFacebook' },
  linkedin: { label: 'LinkedIn', chip: 'bg-bgLinkedin' },
  x: { label: 'X', chip: 'bg-[#111]' },
};

export function providerLabel(identifier: string): string {
  return PROVIDER_META[identifier]?.label ?? identifier;
}

/** Fields the user must/may provide per provider, surfaced in an advanced panel. */
export interface ProviderFieldSpec {
  key: string;
  // text: string input. select: dropdown. tags: comma-separated -> string[].
  // toggle: checkbox -> boolean.
  type: 'text' | 'select' | 'tags' | 'toggle';
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  help?: string;
}

export const PROVIDER_FIELDS: Record<string, ProviderFieldSpec[]> = {
  youtube: [
    {
      key: 'title',
      label: 'Video title',
      type: 'text',
      required: true,
      placeholder: 'My video title',
      help: '2-100 characters. Required by YouTube.',
    },
    {
      key: 'type',
      label: 'Visibility',
      type: 'select',
      required: true,
      options: [
        { value: 'public', label: 'Public' },
        { value: 'unlisted', label: 'Unlisted' },
        { value: 'private', label: 'Private' },
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'tags',
      required: false,
      placeholder: 'travel, vlog, 4k',
      help: 'Comma-separated. Applied to the YouTube upload.',
    },
  ],
  tiktok: [
    {
      key: 'privacy_level',
      label: 'Privacy',
      type: 'select',
      required: true,
      options: [
        { value: 'SELF_ONLY', label: 'Only me (safe for unaudited apps)' },
        { value: 'PUBLIC_TO_EVERYONE', label: 'Everyone' },
        { value: 'FOLLOWER_OF_CREATOR', label: 'Followers' },
        { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
      ],
      help: 'Unaudited TikTok apps can only post SELF_ONLY to a private account.',
    },
    { key: 'duet', label: 'Allow Duet', type: 'toggle', required: false },
    { key: 'stitch', label: 'Allow Stitch', type: 'toggle', required: false },
    { key: 'comment', label: 'Allow Comments', type: 'toggle', required: false },
  ],
  discord: [
    {
      key: 'channel',
      label: 'Discord channel ID',
      type: 'text',
      required: true,
      placeholder: '123456789012345678',
      help: 'The numeric channel ID to post into.',
    },
  ],
  'instagram-standalone': [
    {
      key: 'post_type',
      label: 'Post type',
      type: 'select',
      required: true,
      options: [
        { value: 'post', label: 'Feed post / Reel' },
        { value: 'story', label: 'Story' },
      ],
    },
    {
      key: 'collaborators',
      label: 'Collaborators',
      type: 'tags',
      required: false,
      placeholder: 'username1, username2',
      help: 'Comma-separated Instagram usernames.',
    },
  ],
};

/** A baseline valid settings object per provider; merged with user field values. */
export function defaultSettings(identifier: string): Record<string, unknown> {
  switch (identifier) {
    case 'youtube':
      return { title: '', type: 'public', tags: [] };
    case 'tiktok':
      return {
        privacy_level: 'SELF_ONLY',
        duet: false,
        stitch: false,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false,
        content_posting_method: 'DIRECT_POST',
      };
    case 'discord':
      return { channel: '' };
    case 'instagram-standalone':
    case 'instagram':
      return { post_type: 'post', collaborators: [] };
    default:
      return {};
  }
}

/**
 * Turn a full settings object (from defaults, a Set, or an edited post) into the
 * string-only values the field UI edits. Non-string settings (tags arrays,
 * booleans) are stringified so they show and round-trip instead of being dropped.
 */
export function settingsToFields(
  identifier: string,
  settings?: Record<string, unknown>,
): Record<string, string> {
  const base = { ...defaultSettings(identifier), ...(settings ?? {}) };
  const out: Record<string, string> = {};
  for (const f of PROVIDER_FIELDS[identifier] ?? []) {
    const v = base[f.key];
    switch (f.type) {
      case 'tags':
        out[f.key] = Array.isArray(v) ? v.join(', ') : '';
        break;
      case 'toggle':
        out[f.key] = v === true ? 'true' : 'false';
        break;
      case 'select':
        out[f.key] = typeof v === 'string' && v ? v : (f.options?.[0]?.value ?? '');
        break;
      default:
        out[f.key] = typeof v === 'string' ? v : '';
    }
  }
  return out;
}

/** Inverse of settingsToFields: coerce edited field strings back to API types. */
export function fieldsToSettings(
  identifier: string,
  fv: Record<string, string> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of PROVIDER_FIELDS[identifier] ?? []) {
    const v = fv[f.key];
    switch (f.type) {
      case 'tags':
        out[f.key] = (v ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case 'toggle':
        out[f.key] = v === 'true';
        break;
      default:
        out[f.key] = v ?? '';
    }
  }
  return out;
}
