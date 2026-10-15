import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const origin = site!.toString().replace(/\/$/, "");
  const body = `# *
User-agent: *
Allow: /

# Host
Host: ${origin}

# Sitemaps
Sitemap: ${origin}/sitemap-index.xml
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
