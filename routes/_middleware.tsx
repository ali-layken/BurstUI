import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {

  if (req.url.endsWith("supaheat")) {
    return new Response(null, {
      status: 302, // Temporary Redirect
      headers: { Location: "https://www.youtube.com/watch?v=BBJa32lCaaY" },
    });
  }

  const resp = await ctx.next();
  const headers = resp.headers;

  // Add required headers for Godot Web projects
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");

  return resp;
}