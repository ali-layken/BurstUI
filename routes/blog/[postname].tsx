import DynamicMarkdownItem from "../../islands/DynamicMarkdownItem.tsx";
import BlogPostRenderer from "../../components/BlogRendererSS.tsx";
import BackButton3D from "../../islands/BackButton3D.tsx";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Handlers, PageProps } from "$fresh/server.ts";
import { linklist } from "../../utils/linklist.ts";

interface BlogProps {
  content: string;
  createdTime: string;
  modifiedTime: string;
  title: string;
}

const TitleHeaderID = 'PostTitle';

export const handler: Handlers = {
  GET(_req, ctx) {
    const blogpost: BlogProps | null = fetchBlogpost(ctx.params.postname);
    if (!blogpost) {
      return ctx.renderNotFound({
        custom: "prop",
      });
    }
    return ctx.render({blogpost });
  },
};

const fetchBlogpost = (slug: string): BlogProps | null => {
  const filePath = join(Deno.cwd(), "posts", `${slug}.md`);
  let content: string;
  let createdTime;
  let modifiedTime;

  try {
    const fileStats = statSync(filePath);

    content = readFileSync(filePath, "utf-8");
    createdTime = new Date(fileStats.birthtime).toLocaleString();
    modifiedTime = new Date(fileStats.mtime).toLocaleString();
  } catch {
    return null;
  }

  // Use the parameter as the title
  const title = slug.replace(/_/g, " ").toUpperCase();
  return {
    content: content,
    createdTime: createdTime,
    modifiedTime: modifiedTime,
    title: title
  }
}

export default function Blog(props: PageProps) {

  const postProps = props.data.blogpost
  // Parse Markdown server-side
  const renderedMarkdown = BlogPostRenderer(postProps.content);

  linklist.value.unshift({  id: TitleHeaderID, text: "(Top)", level: 1})
  return (
    <>
      <header class="mb-4">
        <h1 id="PostTitle" class="text-5xl font-bold mb-2 scroll-mt-24">{postProps.title}</h1>
        <p class="text-sm text-subtitles">
          Created: {postProps.createdTime} | Last Edited: {postProps.modifiedTime}
        </p>
      </header>
      {renderedMarkdown.renderedContent}
      <DynamicMarkdownItem />
      <BackButton3D />
    </>
  );
}
