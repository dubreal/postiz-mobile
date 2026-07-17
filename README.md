# postiz-mobile

A **mobile-first web interface for a self-hosted [Postiz](https://github.com/gitroomhq/postiz-app)**.
Postiz has no mobile app and its desktop UI is not responsive
([#740](https://github.com/gitroomhq/postiz-app/issues/740),
[#1008](https://github.com/gitroomhq/postiz-app/issues/1008)). This is a small,
separate front end you run alongside your existing Postiz so you can upload
media, view your calendar, and schedule posts from a phone.

It changes **nothing** in Postiz. It adds no accounts and stores no credentials.
It is a static app plus a thin reverse proxy.

> **Provided as-is, no warranty.** This is an independent project, not affiliated
> with Postiz. It talks to Postiz's private HTTP API, which can change between
> Postiz versions. It may not work on your setup. Read the
> [Security](#security) section before deploying.

---

## What it does

- **Log in** with your existing Postiz account (email + password).
- **Calendar** — see scheduled, published, draft, and failed posts grouped by day.
- **Compose** — pick channels, write a caption, attach media, schedule or save a draft.
- **Media** — browse your Postiz media library and upload photos/videos from your phone.

It does not reimplement Postiz features it does not need. Anything not listed
above, do on the desktop.

## How it works

```
Phone ──https──► m.example.com          (your reverse proxy / tunnel)
                    │
        postiz-mobile (Caddy):
          /          → static SPA
          /api/*     → reverse_proxy to your Postiz   (same origin)
          /uploads/* → reverse_proxy to your Postiz
                    │
        Your Postiz (unchanged)
                    │
Phone ──uploads──► your object storage (only in 'cloudflare' storage mode)
```

Because the app and the proxied `/api` live on the **same origin**, your browser
sends Postiz's own login cookie automatically. postiz-mobile calls the same API
your Postiz desktop uses. There is no second login and no API key.

### Requirement: same registrable domain

Postiz sets its auth cookie for your registrable domain (e.g. `.example.com`).
**postiz-mobile must be served from a subdomain of the same registrable domain as
your Postiz.** For example:

| Your Postiz | postiz-mobile |
|---|---|
| `postiz.example.com` | `m.example.com` ✅ |
| `social.acme.io` | `mobile.acme.io` ✅ |
| `postiz.example.com` | `example.net` ❌ (different domain — login cookie won't apply) |

## Deploy

Requires Docker and a Postiz instance you administer.

1. **Get the code and configure**
   ```bash
   git clone https://github.com/dubreal/postiz-mobile.git
   cd postiz-mobile
   cp .env.example .env
   ```
   Edit `.env`:
   - `POSTIZ_UPSTREAM` — where Postiz is reachable from the container
     (e.g. `http://host.docker.internal:4007` if Postiz is on the same host).
   - `STORAGE_PROVIDER` — **must match your Postiz** `STORAGE_PROVIDER`
     (`local` or `cloudflare`).
   - `MEDIA_ORIGIN` — **only** if `cloudflare`: the public origin of your object
     store (e.g. `https://media.example.com`). Leave empty for `local`.
   - `HOST_PORT` — loopback port your reverse proxy forwards to (default `4008`).

2. **Build and run**
   ```bash
   docker compose up -d --build
   ```
   It listens on `127.0.0.1:${HOST_PORT}`.

3. **Point a subdomain at it** (same registrable domain as your Postiz). Route
   `m.example.com` → `127.0.0.1:${HOST_PORT}` via your existing reverse proxy or
   tunnel (Cloudflare Tunnel, nginx, Traefik, etc.). Terminate HTTPS there.

4. **Object storage only (`STORAGE_PROVIDER=cloudflare`):** add your
   postiz-mobile origin to your bucket's CORS `AllowedOrigins`, so the browser
   can upload directly to storage. Example CORS entry:
   ```json
   { "AllowedOrigins": ["https://m.example.com"],
     "AllowedMethods": ["GET", "PUT"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"] }
   ```
   `local`-storage instances skip this step.

5. Open `https://m.example.com` on your phone and log in. Add to Home Screen for
   an app-like icon.

## Security

Read this before you deploy. The trust model is stated plainly.

- **This app never stores your password or session token.** The login form hands
  your password straight to Postiz's `/api/auth/login` over HTTPS and discards it;
  Postiz returns an `httpOnly` cookie that only your browser and your Postiz see.
  The app's JavaScript cannot read that cookie.
- **The proxy sees login traffic in transit.** Like any reverse proxy in front of
  any login (including Postiz's own), the Caddy process passes the request bytes
  through while forwarding them to Postiz. It does not parse, log, or store them.
  **Run postiz-mobile on infrastructure you control** — it sits in the auth path.
- **Postiz has no two-factor auth.** Login is single-factor, the same as the
  Postiz desktop. If you want a second factor, put an authenticating proxy
  (e.g. Cloudflare Access) in front of `m.example.com`.
- **Postiz session tokens do not expire.** A leaked session cookie stays valid
  until you change your Postiz password. Serve over HTTPS only, and sign out on
  shared devices. Sign-out clears the cookie server-side.
- **Serve over HTTPS only.** The app assumes a secure context (uploads, cookies).
- **No secrets live in this repo or image.** postiz-mobile holds no API keys and
  no credentials. `.env` contains only non-secret settings (URLs, a storage-mode
  flag) and is git-ignored.

## Compatibility

Tested against **Postiz v2.21.9**. It relies on Postiz's private API
(`/api/auth/login`, `/api/user/self`, `/api/user/logout`, `/api/media`) and
public API (`/api/public/v1/*`). These can change across Postiz releases; pin a
Postiz version you have tested, and expect to update after major Postiz upgrades.

Per-provider compose settings are implemented for YouTube, TikTok, Instagram, and
Discord. Other providers can be selected but may need fields this app does not yet
expose; use the desktop for those.

## Development

```bash
npm install
POSTIZ_UPSTREAM=https://your-postiz.example.com npm run dev   # proxies /api during dev
npm run build        # production build to dist/
npm run typecheck
```

Note: the same-registrable-domain cookie rule means auth only fully works when
served from a sibling subdomain of your Postiz; local `npm run dev` can reach the
API but the browser may not retain the cross-site cookie.

## License

MIT. See [LICENSE](./LICENSE).
