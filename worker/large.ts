// /snake/index.wasm - the Godot build's 47 MiB binary. Workers static assets cap individual files at 25 MiB, so this one
// file is streamed through here from GitHub's raw CDN (the repo's own copy, pinned to a commit so the URL never moves)
// on the SAME path the Godot loader already requests. Same-origin, so the site-wide COOP/COEP headers in public/_headers
// need no CORS/CORP exceptions. public/.assetsignore keeps it out of the asset upload.

// URL path -> where the bytes actually live, for files too big for the
// static asset bundle. Pinned to a commit SHA so a later rename/move in the
// repo can't break it; bump the SHA here when the Godot build is re-exported.
export const LARGE_FILES: Record<string, { source: string; contentType: string }> = {
  "/snake/index.wasm": {
    source: "https://raw.githubusercontent.com/ali-layken/BurstUI/357671788fe779176049e7ea72dc59f05c4669f3/static/snake/index.wasm",
    contentType: "application/wasm",
  },
};

export async function serveLarge(request: Request, ctx: ExecutionContext, path: string): Promise<Response> {
  const { source, contentType } = LARGE_FILES[path];

  // Edge cache first, so GitHub is only hit once per POP per day rather
  // than on every game load. (On a bare *.workers.dev hostname the Cache
  // API may be a no-op; then this simply proxies every time, which still
  // works - GitHub's release CDN is fast.)
  // `caches.default` is Workers-only; the lib.dom CacheStorage type that astro check resolves here lacks it.
  const cache = (caches as unknown as { default: Cache }).default;
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
