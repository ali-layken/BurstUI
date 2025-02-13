import { defineRoute, RouteConfig, RouteContext } from "$fresh/server.ts";
import { Partial } from "$fresh/runtime.ts";
import { context } from "https://deno.land/x/esbuild@v0.20.2/mod.js";
import snakeRoute from "../snake.tsx";
import { navDiv } from "../../utils/signals.tsx";
import cubeRoute from "../cube.tsx";
import homeRoute from "../index.tsx";
import blogPostRoute from "../blog/[postname].tsx";

// We only want to render the content, so disable
// the `_app.tsx` template as well as any potentially
// inherited layouts
export const config: RouteConfig = {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
};

export default defineRoute(async (req, ctx: RouteContext) => {


    switch (ctx.params.partial) {
        case "snake":
            return <>
                {snakeRoute()}
                {navDiv.value}
            </>;
        case "cube":
            return <>
                {cubeRoute()}
                {navDiv.value}
            </>;
        case "home":
            return <>
                {await homeRoute()}
                {navDiv.value}
            </>;
        case "blog": {
            const blogpost = ctx.url.searchParams.get("post");
            ctx.params.postname = blogpost ?? "";
            return <>
                {await blogPostRoute(req, ctx)}
                {navDiv.value}
            </>;

        }
        default:
            break;
    }
    // Only render the new content
    return (<p>hi</p>);
});