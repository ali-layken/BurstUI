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
export default defineConfig({
  site: SITE_ORIGIN,
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
