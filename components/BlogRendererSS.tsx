import { marked, Tokens } from "marked";

const renderer = new marked.Renderer();

renderer.image = ({href, _title, text}: Tokens.Image): string => {
  return `
    <figure class="custom-image">
      <img src="${href ?? ""}" alt="${text ?? ""}" />
      ${text ? `<figcaption>${text}</figcaption>` : ""}
    </figure>
  `;
};


export default  function BlogPostRenderer({ content }: { content: string }) {
  const renderedContent = marked(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
    { renderer }
  );

  return (
    <article class="prose lg:prose-xl custom-prose mx-auto">
      <div dangerouslySetInnerHTML={{ __html: renderedContent.toString() }} />
    </article>
  );
}
