import { Head, Partial } from "$fresh/runtime.ts";
import { Handlers, RouteContext } from "$fresh/server.ts";
import { join } from "$std/path/mod.ts";
import BlogPostRenderer from "../../components/BlogRendererSS.tsx";
import TableOfContents from "../../components/TableOfContents.tsx";
import BackButton3D from "../../islands/BackButton3D.tsx";
import DynamicMarkdownItem from "../../islands/DynamicMarkdownItem.tsx";
import { EmptyNav, navDiv } from "../../utils/signals.tsx";
import { readTimestamps } from "../../utils/timestamps.ts";


export interface BlogProps {
  content: string;
  modifiedTime: Date;
  title: string;
  createdTime: Date
}

export const TitleHeaderID: string = "PostTitle";

export const fetchBlogpost = async (
  slug: string,
): Promise<BlogProps | null> => {
  const filePath = join(Deno.cwd(), "posts", `${slug}.md`);

  try {
    // Check if file exists and fetch stats
    const stat = (await readTimestamps())[join("posts", `${slug}.md`)];
    const content = await Deno.readTextFile(filePath);


    // Use the slug as the title
    const title = slug.replace(/_/g, " ");

    return {
      content,
      modifiedTime: new Date(stat.mtime),
      createdTime: new Date(stat.birthtime),
      title,
    };
  } catch (error) {
    navDiv.value = EmptyNav;
    console.error(`Error fetching blogpost '${slug}':`, error);
    return null;
  }
};


export default async function blogPostRoute (_req: Request, ctx: RouteContext)  {
  const { postname } = ctx.params;
  const blogpost = await fetchBlogpost(postname);

  if (!blogpost) {
    return ctx.renderNotFound();
  }

  // Rendered Markdown (example, replace with your renderer)
  const renderedMarkdown = BlogPostRenderer(blogpost.content);
  const [title, subtitle] = blogpost.title.split(':')

  navDiv.value = (      <Partial name="site-nav">
    <div id={`site-nav-container`} class="">
      <TableOfContents headings={renderedMarkdown.headings} />
        <BackButton3D />
    </div>
  </Partial>)
  return (
    <>
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
          <p class="text-3xl my-4 scroll-mt-24 font-source4 italic text-accLiteGreen">{subtitle}</p>
          <span class="text-xs md:text-sm pt-2 font-fixel text-skyBlue">
            Created At: {blogpost.createdTime?.toLocaleString() ?? "N/A"} <span class="text-subtitles">|</span> Last Edited: {blogpost.modifiedTime?.toLocaleString() ?? "N/A"}
          </span>
        </header>
        {renderedMarkdown.renderedContent}
        <DynamicMarkdownItem />
        <BackButton3D />
      </Partial>
    </>
  );
};

