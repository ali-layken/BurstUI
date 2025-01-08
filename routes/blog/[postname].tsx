import { Partial } from "$fresh/runtime.ts";
import { defineRoute, Handlers, RouteContext } from "$fresh/server.ts";
import { join } from "$std/path/mod.ts";
import BlogPostRenderer, {
  HeadingInfo,
} from "../../components/BlogRendererSS.tsx";
import TableOfContents from "../../components/TableOfContents.tsx";
import BackButton3D from "../../islands/BackButton3D.tsx";
import DynamicMarkdownItem from "../../islands/DynamicMarkdownItem.tsx";
import { linklist } from "../../utils/linklist.ts";

export interface BlogProps {
  content: string;
  modifiedTime: string | null;
  title: string;
}

export const TitleHeaderID: string = "PostTitle";

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

export const fetchBlogpost = async (
  slug: string,
): Promise<BlogProps | null> => {
  const filePath = join(Deno.cwd(), "posts", `${slug}.md`);

  try {
    // Check if file exists and fetch stats
    const fileStats = await Deno.stat(filePath);
    const content = await Deno.readTextFile(filePath);

    const modifiedTime = fileStats.mtime
      ? new Date(fileStats.mtime).toLocaleString()
      : null;

    // Use the slug as the title
    const title = slug.replace(/_/g, " ").toUpperCase();

    return {
      content,
      modifiedTime,
      title,
    };
  } catch (error) {
    console.error(`Error fetching blogpost '${slug}':`, error);
    return null;
  }
};

export const blogPostRoute = async (_req: Request, ctx: RouteContext) => {
  const { postname } = ctx.params;
  const blogpost = await fetchBlogpost(postname);

  if (!blogpost) {
    return ctx.renderNotFound();
  }

  // Rendered Markdown (example, replace with your renderer)
  const renderedMarkdown = BlogPostRenderer(blogpost.content);

  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <TableOfContents headings={linklist.value as HeadingInfo[]} />
          <div class="flex items-center justify-center pl-5 pt-2 pb-6">
            <BackButton3D />
          </div>
        </div>
      </Partial>
      <Partial name="main-component">
        <header class="mb-2 text-center">
          <h1
            id="PostTitle"
            class="text-5xl font-bold mb-2 scroll-mt-24 underline decoration-2"
          >
            {blogpost.title}
          </h1>
          <p class="text-sm text-subtitles">
            Last Edited: {blogpost.modifiedTime || "N/A"}
          </p>
        </header>
        {renderedMarkdown.renderedContent}
        <DynamicMarkdownItem />
        <BackButton3D />
      </Partial>
    </>
  );
};

export default defineRoute(blogPostRoute);
