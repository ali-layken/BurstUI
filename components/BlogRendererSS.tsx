import { Tokens, Marked, Renderer } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import { markedEmoji, MarkedEmojiOptions } from "marked-emoji";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
const customRenderer = new Renderer();
customRenderer.link = ({ href, title, text }): string => {
  const safeHref = href ?? "#";
  const safeTitle = title ? `title="${title}"` : "";
  text = marked.parseInline(text) as string;
  return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
};
customRenderer.image = ({ href, text }: Tokens.Image): string => {
  const ogalt: string = text;
  text = marked.parseInline(text) as string;
  return `
  <figure class="custom-image">
    <img src="${href ?? ""}" alt="${ogalt ?? ""}" />
    ${text ? `<figcaption>${text}</figcaption>` : ""}
  </figure>
`;
};
customRenderer.heading = ({ text, depth }: Tokens.Heading): string => {
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

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight: (code, lang) => {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(code, { language }).value;

      // Split the highlighted code into lines
      const lines = highlighted.split("\n");

      const linesWithButtons = lines.map((line, index) => {
        return `<div class="code-line relative group">
                  <span 
                    class="absolute group-hover:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style="top: 9.75px; left: -10.5px; width: 6px; height: 6px; background-color:${burstTextColors.subtitles}; border-radius: 50%;">
                  </span>
                  <span class="pl-2 truncate">${line}</span> <!-- Added truncate to prevent overflow -->
                  <span 
                    class="copy-line-button absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 cursor-pointer text-base"
                    data-line="${encodeURIComponent(code.split("\n")[index] || "")}"
                    title="Copy Button">📋</span>
                </div>`;
      });
      
      
      return `<div data-component="CopyableCodeBlock" data-lang="${language}" data-code="${encodeURIComponent(code)}">${linesWithButtons.join("")}</div>`;
    },
  }),
  {
    renderer: customRenderer,
  }
);



import { Octokit } from "@octokit/rest";
import { burstColors, burstTextColors } from "../static/colors.ts";

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


marked.use(markedSmartypantsLite(), markedEmoji(options));


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
