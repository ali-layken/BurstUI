import { readFileSync } from "node:fs";
import { join } from "node:path";
import BlogPostRenderer from "../../components/BlogRendererSS.tsx";
import DynamicMarkdownItem from "../../islands/DynamicMardownItem.tsx";

import { PageProps } from "$fresh/server.ts";

export default function Blog(props: PageProps) {
  const filePath = join(Deno.cwd(), "posts", `${props.params.postname}.md`);
  let content;

  try {
    content = readFileSync(filePath, "utf-8");
  } catch (_error) {
    return <h1>Post Not Found</h1>;
  }

  // Parse Markdown server-side
  const renderedMarkdown = BlogPostRenderer({ content });
  return (
    <>
        {renderedMarkdown}
        <DynamicMarkdownItem />
    </>
  );
}
