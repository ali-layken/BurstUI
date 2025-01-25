import { Head, Partial } from "$fresh/runtime.ts";
import { Handlers, RouteContext } from "$fresh/server.ts";
import { join } from "$std/path/mod.ts";
import BlogPostRenderer from "../../components/BlogRendererSS.tsx";
import TableOfContents from "../../components/TableOfContents.tsx";
import BackButton3D from "../../islands/BackButton3D.tsx";
import DynamicMarkdownItem from "../../islands/DynamicMarkdownItem.tsx";


export interface BlogProps {
  content: string;
  modifiedTime: Date | null;
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


    // Use the slug as the title
    const title = slug.replace(/_/g, " ");

    return {
      content,
      modifiedTime: fileStats.mtime,
      title,
    };
  } catch (error) {
    console.error(`Error fetching blogpost '${slug}':`, error);
    return null;
  }
};

export default async function blogPostRoute (req: Request, ctx: RouteContext)  {
  const { postname } = ctx.params;
  const blogpost = await fetchBlogpost(postname);

  if (!blogpost) {
    return ctx.renderNotFound();
  }

  // Rendered Markdown (example, replace with your renderer)
  const renderedMarkdown = BlogPostRenderer(blogpost.content);
  const [title, subtitle] = blogpost.title.split(':')

  return (
    <>
      <Partial name="site-nav">
        <div id="site-nav-container" class="hidden">
          <TableOfContents headings={renderedMarkdown.headings} />
            <BackButton3D />
        </div>
      </Partial>
      <Partial name="main-component">
        <Head>
          <meta key= "description" name="description" content={blogpost.title} />

          <title key="title">{subtitle}</title>

          <link key="canonical" rel="canonical" href={`https://burst.deno.dev/blog/${postname}`} />

          <meta property="og:title" content={subtitle} key="og:title" />
          <meta property="og:description" content={blogpost.title} key="og:description" />
          <meta property="og:url" content={`https://burst.deno.dev/blog/${postname}`} key="og:url" />
          <meta property="og:type" content="article" key="og:type" />

          <meta property="article:modified_time" content={blogpost.modifiedTime?.toISOString()} />
          <meta property="article:author" content="https://github.com/ali-layken" />
          <meta property="article:section" content="Computing" />
          {renderedMarkdown.tags.length > 0 && (
            <meta property="article:tag" content={renderedMarkdown.tags.join(", ")} key="og:tags"/>
          )}
        </Head>
        <header class=" text-center">
          <h1
            id="PostTitle"
            class="text-5xl scroll-mt-24 font-source4 underline decoration-2"
          >
            <strong>{title}</strong>
          </h1>
          <p class="text-3xl mt-4 mb-2 scroll-mt-24 font-source4 italic text-accLiteGreen">{subtitle}</p>
          <p class="text-sm font-fixel text-subtitles">
            Last Edited: {blogpost.modifiedTime?.toLocaleString() ?? "N/A"}
          </p>
        </header>
        {renderedMarkdown.renderedContent}
        <DynamicMarkdownItem />
        <BackButton3D />
      </Partial>
    </>
  );
};

