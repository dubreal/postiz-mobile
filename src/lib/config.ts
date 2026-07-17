import type { StorageProvider } from './types';

// Runtime config is injected by the container entrypoint into /config.json from
// the host's env (STORAGE_PROVIDER), so the same static bundle works on any host.
export interface RuntimeConfig {
  storageProvider: StorageProvider;
}

const DEFAULT: RuntimeConfig = { storageProvider: 'local' };

let cached: RuntimeConfig | null = null;

export async function loadConfig(): Promise<RuntimeConfig> {
  if (cached) return cached;
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (res.ok) {
      const json = (await res.json()) as Partial<RuntimeConfig>;
      cached = {
        storageProvider: json.storageProvider === 'cloudflare' ? 'cloudflare' : 'local',
      };
      return cached;
    }
  } catch {
    /* fall through to default */
  }
  cached = DEFAULT;
  return cached;
}

export function getConfig(): RuntimeConfig {
  return cached ?? DEFAULT;
}
