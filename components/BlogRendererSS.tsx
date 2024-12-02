import { marked } from "marked";

export default  function BlogPostRenderer({ content }: { content: string }) {
  // Parse Markdown to HTML asynchronously
  const renderedContent = marked(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    })
  );

  return (
    <article class="prose lg:prose-xl custom-prose mx-auto">
      <div dangerouslySetInnerHTML={{ __html: renderedContent.toString() }} />
    </article>
  );
}
