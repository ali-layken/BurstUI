import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {
  if(ctx.url.pathname.startsWith("/snake") || ctx.url.pathname === "/"){
    const resp = await ctx.next();
    const headers = resp.headers;

    // Add required headers for Godot Web projects
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");

    return resp;
  }
  const resp = await ctx.next();
  return resp;
}