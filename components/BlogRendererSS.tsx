import { Octokit } from "@octokit/rest";
import hljs from "highlight.js";
import { marked, Renderer, Tokens } from "marked";
import { markedEmoji, MarkedEmojiOptions } from "marked-emoji";
import { markedHighlight } from "marked-highlight";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import { JSX } from "preact/jsx-runtime";
import { TitleHeaderID } from "../routes/blog/[postname].tsx";
import { burstTextColors } from "../static/colors.ts";

export interface HeadingInfo {
  id: string;
  text: string;
  level: number;
}
interface RendererResult {
  renderedContent: JSX.Element;
  headings: HeadingInfo[];
}

const customRenderer = new Renderer();
const headings: HeadingInfo[] = [];

customRenderer.link = ({ href, title, text }): string => {
  try {
    const safeHref = href ?? "#";
    const safeTitle = title ? `title="${title}"` : ``;
    text = marked.parseInline(text) as string;
    if (text.endsWith("notab")) {
      return `<a href="${safeHref}" ${safeTitle} rel="noopener noreferrer">${
        text.replace("notab", "")
      }</a>`;
    }
    return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
  } catch (error) {
    console.log(error);
    return "Bad Link Format!";
  }
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
  const id = text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, ""); // Generate unique ID for TOC
  text = marked.parseInline(text) as string;
  const tocHtml = text.replace(/<a[^>]*>(.*?)<\/a>/g, "$1");
  headings.push({ id, text: tocHtml, level: depth }); // Add heading to TOC array

  const leftPad = `style="padding-left: ${depth}rem"`;

  switch (depth) {
    case 1:
      return `
        <${tag} id="${id}">${text}</${tag}>
    `;
    case 3:
      return `
        <${tag} id="${id}" ${leftPad}>${text}</${tag}>
        <hr style="margin: -0.5rem 1.75rem 0.9rem 1.75rem; text-align: left;" />
    `;
    default:
      return `
      <${tag} id="${id}" ${leftPad}>${text}</${tag}>
      `;
  }
};

const hlExt = markedHighlight({
  emptyLangClass: "hljs",
  langPrefix: "hljs language-",
  highlight: (code, lang) => {
    if (lang === "mermaid") {
      return `<pre class="mermaid invisible" data-component="MermaidBlock">${code}</pre>`;
    }
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(code, { language }).value;

    // Split the highlighted code into lines
    const lines = highlighted.split("\n");

    const linesWithButtons = lines.map((line, index) => {
      return `<div class="code-line relative group">
                <span 
                  class="absolute group-hover:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style="top: 8px; left: -12px; width: 6px; height: 6px; background-color:${burstTextColors.subtitles}; border-radius: 50%;">
                </span>
                <span class="pl-2 text-base">${line}</span>
                <span 
                  class="copy-line-button absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 cursor-pointer text-base"
                  data-line="${
        encodeURIComponent(code.split("\n")[index] || "")
      }"
                  title="Copy Button">📋</span>
              </div>`;
    });

    return `<div data-component="CopyableCodeBlock" data-lang="${language}" data-code="${
      encodeURIComponent(code)
    }">${linesWithButtons.join("")}</div>`;
  },
});

const octokit = new Octokit();
const res = await octokit.rest.emojis.get();
const gitEmojis = res.data;

// Custom emoji set
const customEmojis = {
  "arch_linux": "/emojis/arch.png",
  "google_logo": "/emojis/google.ico",
  "apple_logo": "/emojis/apple.ico",
  "r_pi": "/emojis/raspi.ico",
  "debian_logo": "/emojis/debian.ico",
  "red_hat_logo": "/emojis/redhat.ico",
  "chromium_logo": "/emojis/chromium.png",
  "podman_logo": "/emojis/podman.webp",
};

const options: MarkedEmojiOptions = {
  emojis: { ...gitEmojis, ...customEmojis },
  renderer: (token) =>
    `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`,
};

marked.use(
  hlExt,
  {
    renderer: customRenderer,
  },
  markedSmartypantsLite(),
  markedEmoji(options),
);

export default function BlogPostRenderer(content: string): RendererResult {
  headings.length = 0;
  const renderedContent = marked.parse(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
  );
  headings.unshift({ id: TitleHeaderID, text: "(Top)", level: 0 });
  return {
    renderedContent: (
      <article class="prose lg:prose-xl custom-prose mx-auto">
        <div dangerouslySetInnerHTML={{ __html: renderedContent as string }} />
      </article>
    ),
    headings: headings,
  };
}
