# Security Policy

postiz-mobile sits in the authentication path of your self-hosted Postiz (it is a
same-origin reverse proxy plus a static SPA). Security reports are taken
seriously. Thank you for helping keep users safe.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately via GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** (GitHub Security Advisories).
3. Describe the issue with enough detail to reproduce.

If private reporting is unavailable to you, open a regular issue that says only
"security report, please enable a private channel" — with **no details** — and
you'll be contacted to move it private.

Please include, where relevant:

- A clear description and impact.
- Steps to reproduce or a proof of concept.
- Affected component (SPA, Caddy proxy config, Docker image, docs).
- Your Postiz version, storage provider, and how you serve the app.

## Scope

In scope:

- The SPA (`src/`), the Caddy reverse-proxy config (`Caddyfile`), the container
  build (`Dockerfile`, `docker-entrypoint.sh`, `docker-compose.yml`), and the
  handling of the Postiz auth cookie / org API key by this app.

Out of scope:

- Vulnerabilities in **Postiz itself** — report those to the
  [Postiz project](https://github.com/gitroomhq/postiz-app).
- Issues that require a misconfigured or hostile deployment the operator controls
  (e.g. serving over plain HTTP, exposing the loopback port directly, or pointing
  `POSTIZ_UPSTREAM` at an untrusted host).
- Missing hardening already documented as an operator responsibility in the
  README [Security](README.md#security) section (login rate-limiting, 2FA,
  `local`-mode upload size caps).

## Expectations

This is a small, independent project maintained on a best-effort basis, provided
as-is with no warranty (AGPL-3.0). There is no guaranteed response time or bug
bounty. Valid reports will be acknowledged and addressed as capacity allows, and
credit is given if you'd like it.

## Good to know

- postiz-mobile stores **no** credentials: your password is passed to Postiz and
  discarded, the session lives in Postiz's `httpOnly` cookie, and the org API key
  is held only in memory and sent only to same-origin `/api/public/v1/*`.
- It never modifies your Postiz database, files, or configuration; it only calls
  Postiz's HTTP API with your own session.
