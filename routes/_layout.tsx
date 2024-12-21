import { Handlers, PageProps } from "$fresh/server.ts";
import ResizeDetector from "../islands/ResizeDetector.tsx";
import { isNarrowSig, linklist } from "../utils/linklist.ts";
import { getCookies } from "$std/http/cookie.ts";

export const handler: Handlers = {
    GET(req, ctx) {
      const cookies = getCookies(req.headers); // Access cookies
      const isNarrowFromCookie = cookies["isNarrow"] === "true";
  
      // Pass the cookie data to the render context
      return ctx.render({ isNarrow: isNarrowFromCookie });
    },
  };


export default function Layout({ Component, route, data }: PageProps) {
    if(data?.isNarrow) console.log(data.isNarrow);
    // do something with state here
    return (
        <div class="layout">
            <div id="background-container" class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
                <div id="wide-top-container"></div>
                <div id="main-container">
                    <div id="wide-nav-container"></div>
                    <div id="component-container" class="invisible">
                        <Component />
                    </div>
                </div>
                <div id="wide-bottom-or-narrow-nav-container"></div>
            </div>
            <ResizeDetector currentPage={route} headingsSignal={linklist} isNarrowSig={isNarrowSig} />
        </div>
    );
}