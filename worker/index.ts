// The only server-side code left. wrangler.jsonc routes just the paths in
// run_worker_first here; every other request is answered straight from the
// static asset bundle without invoking this Worker at all.
//
// Two jobs:
//   1. /api/joke - the old Fresh API route.
//   2. /snake/index.wasm - the Godot build's 47 MiB binary. Workers static
//      assets cap individual files at 25 MiB, so this one file lives in an
//      R2 bucket (free tier) and is streamed through here on the SAME path
//      the Godot loader already requests. Same-origin, so the site-wide
//      COOP/COEP headers in public/_headers need no CORS/CORP exceptions.
//      public/.assetsignore keeps it out of the asset upload.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LARGE: R2Bucket;
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

// R2 object key -> response content type, for files too big for the
// static asset bundle. Keys match the URL path without the leading slash.
const LARGE_FILES: Record<string, string> = {
  "snake/index.wasm": "application/wasm",
};

async function serveLarge(request: Request, env: Env, ctx: ExecutionContext, key: string): Promise<Response> {
  // Edge cache first: R2 reads are metered (generously, but metered); the
  // cache is not, and the file changes only when the game is re-exported.
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const object = await env.LARGE.get(key);
  if (!object) {
    return new Response(`${key} is not in the R2 bucket yet - see README "Deploying".`, {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", LARGE_FILES[key]);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=86400");
  // Match what public/_headers applies to everything else, so this file
  // can't be the one thing that breaks cross-origin isolation.
  headers.set("cross-origin-resource-policy", "same-origin");

  const response = new Response(object.body, { headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/joke") {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      return new Response(joke, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const key = url.pathname.slice(1);
    if (key in LARGE_FILES && (request.method === "GET" || request.method === "HEAD")) {
      return serveLarge(request, env, ctx, key);
    }

    // Anything else we were handed: fall through to the asset layer so the
    // normal 404 page is served.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
