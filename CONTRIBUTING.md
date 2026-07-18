# Contributing to postiz-mobile

Thanks for your interest. This is a small, independent companion app for
self-hosted [Postiz](https://github.com/gitroomhq/postiz-app), maintained on a
best-effort basis. Contributions are welcome within the scope below.

## Before you start

- **It has only been tested on one setup:** Postiz **v2.21.9** with Cloudflare R2
  storage, served from a subdomain of the same registrable domain as Postiz. The
  most valuable contributions right now are reports (and fixes) confirming or
  breaking it on other configs: other Postiz versions, `local` / AWS S3 / MinIO
  storage, and other domain layouts.
- **Bugs in Postiz itself** go to the [Postiz repo](https://github.com/gitroomhq/postiz-app),
  not here.
- **Security issues:** do not open a public issue. See [SECURITY.md](SECURITY.md).

## Scope

postiz-mobile deliberately stays small. It is a phone-friendly front end for the
things you actually do on the go (calendar, compose, media, drafts, sets). It is
**not** trying to reimplement the Postiz desktop.

- In scope: mobile UX, per-channel compose options, reliability across Postiz
  versions/storage backends, accessibility, docs.
- Out of scope: features that duplicate the desktop for their own sake, anything
  that stores credentials, and anything that writes to Postiz outside its
  documented HTTP API. The app must never be able to damage a user's Postiz.

Open an issue to discuss anything non-trivial before building it.

## Development

```bash
npm install
POSTIZ_UPSTREAM=https://your-postiz.example.com npm run dev   # proxies /api during dev
npm run typecheck
npm run build
```

Auth only fully works when served from a sibling subdomain of your Postiz (the
same-registrable-domain cookie rule), so `npm run dev` can reach the API but the
browser may not retain the cross-site cookie. See the README
[Deploy](README.md#deploy) section to test end to end in a container.

## Pull requests

- Keep PRs small and focused; one concern per PR.
- Match the existing code style (TypeScript, the current component patterns and
  design tokens). No new runtime dependencies without discussion.
- `npm run typecheck` and `npm run build` must pass.
- Prefer native platform features and existing helpers over new abstractions.
- Note how you tested it, including your Postiz version and storage provider.
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org)
  (e.g. `fix(compose): ...`). Avoid em dashes in prose.

## License

By contributing, you agree that your contributions are licensed under the
project's [AGPL-3.0](LICENSE) license. postiz-mobile reuses Postiz's design tokens
and uploader (also AGPL-3.0); keep any Postiz-derived code compatible with that.
