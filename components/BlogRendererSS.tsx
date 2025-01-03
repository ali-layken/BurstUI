import { Tokens, Marked, Renderer } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import { markedEmoji, MarkedEmojiOptions } from "marked-emoji";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { Octokit } from "@octokit/rest";
import { burstTextColors } from "../static/colors.ts";
import { JSX } from "preact/jsx-runtime";
import { linklist } from "../utils/linklist.ts";
import { TitleHeaderID } from "../routes/blog/[postname].tsx";
import { stringToIdentifier } from "$fresh/src/server/init_safe_deps.ts";

export interface HeadingInfo { id: string; text: string; level: number }
interface RendererResult {
  renderedContent: JSX.Element;
  headings: HeadingInfo[];
}

const customRenderer = new Renderer();
const headings: HeadingInfo[] = [];

customRenderer.link = ({ href, title, text }): string => {
  try{
    const safeHref = href ?? "#";
    const safeTitle = title ? `title="${title}"` : "";
    text = marked.parseInline(text) as string;
    if(text.endsWith('notab')){
      return `<a href="${safeHref}" ${safeTitle} rel="noopener noreferrer">${text.replace('notab', '')}</a>`;
    }
    return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
  } catch (error){
    console.log(error);
    return 'Bad Link Format!';
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

  const leftPad = `style="padding-left: ${depth}rem"`

  switch (depth) {
    case 1:
      return `
        <${tag} id="${id}">${text}</${tag}>
    `;
    case 3:
      return `
        <${tag} id="${id}" ${leftPad}>${text}</${tag}>
        <hr style="margin: -0.9rem 2rem 1rem 1.75rem; text-align: left;" />
    `;
    default:
      return `
      <${tag} id="${id}" ${leftPad}>${text}</${tag}>
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
                    style="top: 8px; left: -12px; width: 6px; height: 6px; background-color:${burstTextColors.subtitles}; border-radius: 50%;">
                  </span>
                  <span class="pl-2 text-base">${line}</span>
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

const octokit = new Octokit();
const res = await octokit.rest.emojis.get();
const gitEmojis = res.data;

// Custom emoji set
const customEmojis = {
  "arch_linux":
    "https://github.com/archlinux/archweb/blob/master/sitestatic/favicon.png?raw=true",
  "google_logo":
    "https://www.google.com/favicon.ico",
  "apple_logo":
    "https://www.apple.com/favicon.ico",
  "r_pi":
    "https://www.raspbian.org/static/favicon.ico",
  "debian_logo":
    "https://www.debian.org/favicon.ico"
};

const options: MarkedEmojiOptions = {
  emojis: { ...gitEmojis, ...customEmojis },
  renderer: (token) =>
    `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`,
};


marked.use(markedSmartypantsLite(), markedEmoji(options));


export default function BlogPostRenderer(content: string): RendererResult {
  headings.length = 0;
  const renderedContent = marked.parse(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
  );
  headings.unshift({  id: TitleHeaderID, text: "(Top)", level: 0})
  linklist.value = headings
  return {
    renderedContent: (
      <article class="prose lg:prose-xl custom-prose mx-auto">
        <div dangerouslySetInnerHTML={{ __html: renderedContent as string }} />
      </article>
    ),
    headings: headings};
}
