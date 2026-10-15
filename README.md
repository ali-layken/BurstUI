# BurstUI

This site is made in TypeScript with [Astro](https://astro.build) and Preact
islands, built to plain static files and served from Cloudflare Workers
static assets. The JavaScript in the Languages section comes from the Godot
HTML5 engine I am using for one of my pages.

It used to be a Deno Fresh app on Deno Deploy; that moved here in October
2026 after Cloudflare bought Deno and announced Deploy's shutdown.

## Layout

- `posts/*.md` - blog posts. The filename is the URL (`/blog/<filename>`),
  `Name:_Subtitle` splits into title and subtitle, and a leading `_` hides a
  post from the index (it stays reachable by URL). `timestamps.json` holds
  created/modified times (`npm run timestamps` regenerates it from the
  filesystem on the machine the posts were written on).
- `src/pages/` - routes. `src/layouts/Base.astro` is the shell every page
  shares (head/meta, wide nav column, bottom nav on narrow screens).
- `src/islands/` - the interactive Preact bits (three.js title, cube, back
  button, copy buttons, the markdown post-processor). `{{ SpinningCube }}`
  inside a post drops that island into the rendered markdown.
- `src/lib/BlogRendererSS.tsx` - the marked pipeline (highlight.js, GitHub
  emoji from `allemojislist.json`, mermaid placeholders, copyable code
  lines). Runs at build time only.
- `public/` - served verbatim at the site root: fonts, images, the Godot
  `snake/` build, `twitch-callback.html` (DoopWatcher's Twitch OAuth landing
  page), `config.json` (FaustusConnect's remote kill switch), plus
  Cloudflare's `_headers`, `_redirects` and `.assetsignore`.
- `worker/index.ts` - the only request-time code: `/api/joke`, and
  `/snake/index.wasm` streamed from R2 because it is over Cloudflare's
  25 MiB per-asset cap.
- `src/lib/site.mjs` - the public hostname, used for canonical/og URLs,
  robots.txt and the sitemap. Override with `SITE_ORIGIN=... npm run build`.

## Developing

```shellsession
$ npm install
$ npm run dev        # Astro dev server with HMR (no Worker: /api/joke and the wasm 404)
$ npm run preview    # full build, then wrangler dev serving it like production
$ npm run check      # astro check (types)
```

For `npm run preview` to serve the snake game locally, seed the local R2
emulation once:

```shellsession
$ npx wrangler r2 object put burstui-large/snake/index.wasm --file public/snake/index.wasm --content-type application/wasm --local
```

## Deploying

Pushes to `main` build and deploy through `.github/workflows/deploy.yml`.
It needs two repository secrets, `CLOUDFLARE_API_TOKEN` (Workers Scripts:
Edit, Workers R2 Storage: Edit, Account Settings: Read) and
`CLOUDFLARE_ACCOUNT_ID`, and optionally a `SITE_ORIGIN` repository variable
if the site is on a custom domain.

One-time setup on a new Cloudflare account:

```shellsession
$ npx wrangler login
$ npx wrangler r2 bucket create burstui-large
$ npm run deploy
$ npx wrangler r2 object put burstui-large/snake/index.wasm --file public/snake/index.wasm --content-type application/wasm --remote
```

Things outside this repo that embed this site's hostname (update them if it
ever changes again): DoopWatcher's Twitch redirect URI and support link, the
Twitch developer console's registered redirect URIs, and FaustusConnect's
remote config URL.
