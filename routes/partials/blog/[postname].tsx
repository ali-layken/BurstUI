import { defineRoute, Handlers, RouteConfig } from "$fresh/server.ts";
import blogPostRoute, { BlogProps, fetchBlogpost} from "../../blog/[postname].tsx";

export const config: RouteConfig = {
  skipAppWrapper: true,
  skipInheritedLayouts: true,
};

export const handler: Handlers = {
  async GET(_req, ctx) {
    const blogpost: BlogProps | null = await fetchBlogpost(ctx.params.postname);
    if (!blogpost) {
      return ctx.renderNotFound({
        custom: "prop",
      });
    }
    return ctx.render({ blogpost });
  },
};

export default defineRoute(blogPostRoute);
