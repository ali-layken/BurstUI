import { marked, Tokens } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
marked.use(markedSmartypantsLite());
const renderer = new marked.Renderer();

renderer.image = ({href, text}: Tokens.Image): string => {
  return `
    <figure class="custom-image">
      <img src="${href ?? ""}" alt="${text ?? ""}" />
      ${text ? `<figcaption>${text}</figcaption>` : ""}
    </figure>
  `;
};

// Customize heading rendering for better semantics and styling
renderer.heading = ({text, depth}: Tokens.Heading): string => {
  const tag = `h${depth}`;
  switch (depth) {
    case 2:
      return `
        <${tag}>${text}</${tag}>
      `;
    case 3:
      return `
        <div style="height: 0.5rem; display: block;"></div>
          <${tag}>${text}</${tag}>
        <hr/>
        <div style="height: 0.5rem; display: block;"></div>
    `;
    default:
      return `<${tag}>${text}</${tag}>`;
  }
};

// Customize link rendering to add target and rel attributes
renderer.link = ({href, title, text}): string => {
  const safeHref = href ?? "#";
  const safeTitle = title ? `title="${title}"` : "";
  return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

marked.setOptions({
  renderer: renderer
})

export default  function BlogPostRenderer({ content }: { content: string }) {
  const renderedContent = marked.parse(
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