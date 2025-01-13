import { FreshContext } from "$fresh/server.ts";

export async function handler(req: Request, ctx: FreshContext) {
  if(ctx.url.pathname.startsWith("/snake/")){
    // Process the response and set necessary headers
    const resp = await ctx.next();
    const headers = resp.headers;

    // Add required headers for Godot Web projects
    headers.set("Cross-Origin-Opener-Policy", "same-origin");
    headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    console.log(ctx.url.href)

    // Return the modified response
    return resp;
  }
  const resp = await ctx.next();
  return resp;
}