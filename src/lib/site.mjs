// The one place the public hostname lives. Everything that emits an absolute
// URL (canonical/og tags, robots.txt, sitemap) reads it from here (via
// Astro.site), so moving hosts again is a one-line change + a rebuild.
//
// Override at build time with SITE_ORIGIN=https://example.com npm run build
// (the deploy workflow does exactly that from a repo variable, see
// .github/workflows/deploy.yml).
export const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://burstui.burstui.workers.dev";
