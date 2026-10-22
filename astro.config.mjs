// @ts-check
import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import { SITE_ORIGIN } from "./src/lib/site.mjs";

// Fully static output. Every page here is pre-renderable (markdown posts,
// the two demos, the 404) so no server runtime is needed at request time;
// the only code that runs on Cloudflare per request is worker/index.ts,
// scoped to /api/* in wrangler.jsonc. Static asset requests are free and
// unlimited on the Workers free plan - keeping the site static is what
// keeps it free.
// `astro dev` ignores public/_headers (Cloudflare applies that file in production and under `wrangler dev`), so the Godot
// build under /snake never gets cross-origin isolation locally and fails with no SharedArrayBuffer. Send the same two
// headers from the dev server so the game loads under `npm run dev` too.
/** @type {import("vite").Plugin} */
const crossOriginIsolationDev = {
  name: "cross-origin-isolation-dev",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((_req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      next();
    });
  },
};

export default defineConfig({
  site: SITE_ORIGIN,
  vite: { plugins: [crossOriginIsolationDev] },
  integrations: [
    preact(),
    sitemap({
      // Draft posts (filename starts with "_") are routable but unlisted,
      // same as the old Fresh index page - keep them out of the sitemap too.
      filter: (page) => !page.includes("/blog/_"),
    }),
  ],
  // `file` + `never` keeps the exact URLs the Fresh site had
  // (/blog/<name>, /snake, /cube - no trailing slash). Cloudflare's
  // auto-trailing-slash handling serves dist/blog/<name>.html for
  // /blog/<name> and redirects /blog/<name>/ back to it.
  build: { format: "file" },
  trailingSlash: "never",
});
