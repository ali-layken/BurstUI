import { Handlers, RouteConfig } from "$fresh/server.ts";
import snakeRoute from "../snake.tsx";


export const handler: Handlers = {
  async GET(_req, ctx) {
    const resp = await ctx.render();
    resp.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    resp.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    return resp;
  },
};

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export default snakeRoute