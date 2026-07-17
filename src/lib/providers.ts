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
  label: string;
  type: 'text' | 'select';
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
