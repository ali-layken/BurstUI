

import { FreshContext } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";

interface State {
  isNarrowCookie: boolean | undefined;
}

export async function handler( req: Request, ctx: FreshContext<State>) {
  const cookies = getCookies(req.headers); // Access cookies
  switch (cookies["isNarrow"]) {
    case 'true':
        ctx.state.isNarrowCookie = true
        break;
    case 'false':
        ctx.state.isNarrowCookie = false
        break;
    default:
        ctx.state.isNarrowCookie = undefined
        break;
  }
  const resp = await ctx.next();
  resp.headers.set("server", "fresh server");
  return resp;
}