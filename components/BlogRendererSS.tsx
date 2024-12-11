import { Tokens, Marked } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import { markedEmoji, MarkedEmojiOptions } from "marked-emoji";
import { markedHighlight } from "marked-highlight";
import hljsJS from "highlight.js/lib/languages/javascript";
import hljsBash from "highlight.js/lib/languages/bash";
import hljs from "highlight.js/lib/core";
hljs.registerLanguage("javascript", hljsJS);
hljs.registerLanguage("bash", hljsBash);
const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    highlight: (code, lang) => {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(code, { language }).value;

      // Explicitly add langPrefix manually if not handled
      return `<pre data-component="CopyableCodeBlock" data-lang="${language}" data-code="${encodeURIComponent(code)}"><code class="hljs language-${language}">${highlighted}</code></pre>`;
    },
  })
);



import { Octokit } from "@octokit/rest";



const octokit = new Octokit();
const res = await octokit.rest.emojis.get();
const gitEmojis = res.data;

// Custom emoji set
const customEmojis = {
  "arch_linux":
    "https://github.com/archlinux/archweb/blob/master/sitestatic/favicon.png?raw=true",
};

const options: MarkedEmojiOptions = {
  emojis: { ...gitEmojis, ...customEmojis },
  renderer: (token) =>
    `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`,
};

const renderer = new marked.Renderer();
marked.use(markedSmartypantsLite(), markedEmoji(options));
marked.setOptions({ renderer });

renderer.image = ({ href, text }: Tokens.Image): string => {
  const ogalt: string = text;
  text = marked.parseInline(text) as string;
  return `
  <figure class="custom-image">
    <img src="${href ?? ""}" alt="${ogalt ?? ""}" />
    ${text ? `<figcaption>${text}</figcaption>` : ""}
  </figure>
`;
};

renderer.heading = ({ text, depth }: Tokens.Heading): string => {
  const tag = `h${depth}`;
  text = marked.parseInline(text) as string;
  switch (depth) {
    case 3:
      return `
        <div style="height: 1rem; display: block;"></div>
        <${tag}>${text}</${tag}>
        <hr style="width: 66%; margin: 0rem 0 0.5rem; text-align: left;" />
    `;
    default:
      return `
      <div style="height: 1rem; display: block;"></div>
      <${tag}>${text}</${tag}>
      `;
  }
};

// Customize link rendering to add target and rel attributes
renderer.link = ({ href, title, text }): string => {
  const safeHref = href ?? "#";
  const safeTitle = title ? `title="${title}"` : "";
  text = marked.parseInline(text) as string;
  return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
};

export default function BlogPostRenderer({ content }: { content: string }) {
  const renderedContent = marked.parse(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
  );

  return (
    <article class="prose lg:prose-xl custom-prose mx-auto">
      <div dangerouslySetInnerHTML={{ __html: renderedContent as string }} />
    </article>
  );
}
