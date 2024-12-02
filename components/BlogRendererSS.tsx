import { marked } from "marked";

export default  function BlogPostRenderer({ content }: { content: string }) {
  // Parse Markdown to HTML asynchronously
  const renderedContent = marked.parse(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
    { async: false }
  );

  return (
    <article class="prose lg:prose-xl mx-auto">
      <div dangerouslySetInnerHTML={{ __html: renderedContent.toString() }} />
    </article>
  );
}
