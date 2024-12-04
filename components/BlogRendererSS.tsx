import { marked, Tokens } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import {markedEmoji, MarkedEmojiOptions} from "marked-emoji";
import {Octokit} from "@octokit/rest";

const octokit = new Octokit();
const res = await octokit.rest.emojis.get();
const emojis = res.data;
const options : MarkedEmojiOptions = {
	emojis,
	renderer: (token) => `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`
};
marked.use(markedSmartypantsLite(), markedEmoji(options));
const renderer = new marked.Renderer();
marked.setOptions({
  renderer: renderer
})

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
  // Split the text into parts: matches (like :emoji:) and non-matches
  const parts = text.split(/(:\w+?:)/g); // Regex matches :emoji: patterns
  const processedParts = parts.map((part) => {
    if (part.startsWith(":") && part.endsWith(":")) {
      // Process emoji parts with marked.parse
      return (marked.parseInline(part) as string).trim(); // Trim unnecessary whitespace
    }
    // Return non-emoji parts untouched
    return part;
  });

  // Rejoin processed and untouched parts
  const emojied = processedParts.join("");
  switch (depth) {
    case 3:
      return `
        <div style="height: 1rem; display: block;"></div>
        <${tag}>${emojied}</${tag}>
        <hr style="width: 66%; margin: 0rem 0 0.5rem; text-align: left;" />
    `;
    default:
      return `<${tag}>${emojied}</${tag}>`;
  }
};

// Customize link rendering to add target and rel attributes
renderer.link = ({href, title, text}): string => {
  const safeHref = href ?? "#";
  const safeTitle = title ? `title="${title}"` : "";
  return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

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