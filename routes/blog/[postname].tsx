import { Handlers, PageProps } from "$fresh/server.ts";
import { join } from "$std/path/mod.ts";
import BlogPostRenderer from "../../components/BlogRendererSS.tsx";
import BackButton3D from "../../islands/BackButton3D.tsx";
import DynamicMarkdownItem from "../../islands/DynamicMarkdownItem.tsx";

interface BlogProps {
  content: string;
  createdTime: string | null;
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

const fetchBlogpost = async (slug: string): Promise<BlogProps | null> => {
  const filePath = join(Deno.cwd(), "posts", `${slug}.md`);

  try {
    // Check if file exists and fetch stats
    const fileStats = await Deno.stat(filePath);
    const content = await Deno.readTextFile(filePath);

    const createdTime = fileStats.ctime
      ? fileStats.ctime.toLocaleString()
      : null; // Use null if birthtime is not available

    const modifiedTime = fileStats.mtime
      ? new Date(fileStats.mtime).toLocaleString()
      : null;

    // Use the slug as the title
    const title = slug.replace(/_/g, " ").toUpperCase();

    return {
      content,
      createdTime,
      modifiedTime,
      title,
    };
  } catch (error) {
    console.error(`Error fetching blogpost '${slug}':`, error);
    return null;
  }
};

export default function Blog(props: PageProps) {
  const postProps = props.data.blogpost;

  // Rendered Markdown (example, replace with your renderer)
  const renderedMarkdown = BlogPostRenderer(postProps.content);

  return (
    <>
      <header class="mb-4">
        <h1 id="PostTitle" class="text-5xl font-bold mb-2 scroll-mt-24">
          {postProps.title}
        </h1>
        <p class="text-sm text-subtitles">
          Created: {postProps.createdTime || "N/A"} | Last Edited: {postProps.modifiedTime || "N/A"}
        </p>
      </header>
      {renderedMarkdown.renderedContent}
      <DynamicMarkdownItem />
      <BackButton3D />
    </>
  );
}
