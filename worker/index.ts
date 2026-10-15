// The only server-side code left. wrangler.jsonc routes just the paths in
// run_worker_first here; every other request is answered straight from the
// static asset bundle without invoking this Worker at all.
//
// Two jobs:
//   1. /api/joke - the old Fresh API route.
//   2. /snake/index.wasm - the Godot build's 47 MiB binary. Workers static
//      assets cap individual files at 25 MiB, so this one file is streamed
//      through here from GitHub's raw CDN (the repo's own copy, pinned to a
//      commit so the URL never moves) on the SAME path the Godot loader
//      already requests. Same-origin, so the site-wide
//      COOP/COEP headers in public/_headers need no CORS/CORP exceptions.
//      public/.assetsignore keeps it out of the asset upload.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// Jokes courtesy of https://punsandoneliners.com/randomness/programmer-jokes/
const JOKES = [
  "Why do Java developers often wear glasses? They can't C#.",
  "A SQL query walks into a bar, goes up to two tables and says “can I join you?”",
  "Wasn't hard to crack Forrest Gump's password. 1forrest1.",
  "I love pressing the F5 key. It's refreshing.",
  "Called IT support and a chap from Australia came to fix my network connection.  I asked “Do you come from a LAN down under?”",
  "There are 10 types of people in the world. Those who understand binary and those who don't.",
  "Why are assembly programmers often wet? They work below C level.",
  "My favourite computer based band is the Black IPs.",
  "What programme do you use to predict the music tastes of former US presidential candidates? An Al Gore Rhythm.",
  "An SEO expert walked into a bar, pub, inn, tavern, hostelry, public house.",
];

// URL path -> where the bytes actually live, for files too big for the
// static asset bundle. Pinned to a commit SHA so a later rename/move in the
// repo can't break it; bump the SHA here when the Godot build is re-exported.
const LARGE_FILES: Record<string, { source: string; contentType: string }> = {
  "/snake/index.wasm": {
    source: "https://raw.githubusercontent.com/ali-layken/BurstUI/357671788fe779176049e7ea72dc59f05c4669f3/static/snake/index.wasm",
    contentType: "application/wasm",
  },
};

async function serveLarge(request: Request, ctx: ExecutionContext, path: string): Promise<Response> {
  const { source, contentType } = LARGE_FILES[path];

  // Edge cache first, so GitHub is only hit once per POP per day rather
  // than on every game load. (On a bare *.workers.dev hostname the Cache
  // API may be a no-op; then this simply proxies every time, which still
  // works - GitHub's release CDN is fast.)
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const upstream = await fetch(source, {
    headers: { "user-agent": "BurstUI worker (https://github.com/ali-layken/BurstUI)" },
    redirect: "follow",
  });
  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream for ${path} returned ${upstream.status}`, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=86400");
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("etag", etag);
  const length = upstream.headers.get("content-length");
  if (length) headers.set("content-length", length);
  // Match what public/_headers applies to everything else, so this file
  // can't be the one thing that breaks cross-origin isolation.
  headers.set("cross-origin-resource-policy", "same-origin");

  const response = new Response(upstream.body, { status: 200, headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  return response;
}

export default {
  async fetch(request: Request, _env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/joke") {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      return new Response(joke, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (url.pathname in LARGE_FILES && (request.method === "GET" || request.method === "HEAD")) {
      return serveLarge(request, ctx, url.pathname);
    }

    // Anything else we were handed: fall through to the asset layer so the
    // normal 404 page is served.
    return _env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
