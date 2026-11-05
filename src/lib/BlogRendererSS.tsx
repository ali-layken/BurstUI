import hljs from "highlight.js";
import { Marked, Renderer, type Tokens } from "marked";
import { type EmojiToken, markedEmoji, type MarkedEmojiOptions } from "marked-emoji";
import { markedHighlight } from "marked-highlight";
import gitEmojis from "../../allemojislist.json";
import { burstTextColors } from "./colors";

/** id of the post <h1>; the ToC's "(Top)" entry links to it. */
export const TitleHeaderID = "PostTitle";

export interface HeadingInfo {
  id: string;
  text: string;
  level: number;
}
export interface RendererResult {
  /** Rendered post body as an HTML string (goes in via set:html). */
  html: string;
  headings: HeadingInfo[];
  tags: string[];
}

const customRenderer = new Renderer();
const headings: HeadingInfo[] = [];

customRenderer.link = ({ href, title, text }): string => {
  try {
    const safeHref = href ?? "#";
    const safeTitle = title ? `title="${title}"` : ``;
    text = md.parseInline(text) as string;
    if (text.endsWith("jump")) {
      return `<a href=${href}>${text.replace("jump", "")}</a>`;
    }
    return `<a href="${safeHref}" ${safeTitle} target="_blank" rel="noopener noreferrer">${text}</a>`;
  } catch (error) {
    console.log(error);
    return "Bad Link Format!";
  }
};
customRenderer.image = ({ href, text }: Tokens.Image): string => {
  const ogalt: string = text;
  text = md.parseInline(text) as string;
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
  text = md.parseInline(text) as string;
  headings.push({ id, text: text.replace(/<a[^>]*>(.*?)<\/a>/g, "$1"), level: depth }); // ToC entries carry no links
  // h3s get a rule under them.
  return `<${tag} id="${id}">${text}</${tag}>${depth === 3 ? "<hr />" : ""}\n`;
};

const hlExt = markedHighlight({
  emptyLangClass: "hljs",
  langPrefix: "hljs language-",
  highlight: (code, lang) => {
    if (lang === "mermaid") {
      return `<pre class="mermaid invisible" data-component="MermaidBlock" data-code="${encodeURIComponent(code)}">${code}</pre>`;
    }
  
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    const codeLines = code.split('\n');
  
    // One row per line, each with a hover dot on the left and a copy button on the right (wired up client-side by
    // islands/CopyableCodeBlock.tsx).
    const linesWithButtons = codeLines.map((line) => {
      if (line === "") return `<br />`;
      return `<div class="code-line relative group">
        <span
          class="absolute group-hover:inline-block opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style="top: 8px; left: -12px; width: 6px; height: 6px; background-color:${burstTextColors.subtitles}; border-radius: 50%;">
        </span>
        <span class="pl-2 text-base">${hljs.highlight(line, { language }).value}</span>
        <span
          class="copy-line-button absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 cursor-pointer text-base"
          data-line="${encodeURIComponent(line)}"
          title="Copy Button">📋</span>
      </div>`;
    });

    return `<div data-component="CopyableCodeBlock" data-lang="${language}" data-code="${
      encodeURIComponent(code)
    }">${linesWithButtons.join("")}</div>`;
  }
});

// GitHub's emoji set comes from the committed allemojislist.json (scripts/generate_emojis.mjs keeps it fresh), never
// from a live API call: this module runs inside `astro build` only. Plus the site's own logos:
const customEmojis = {
  "arch_linux": "/emojis/arch.png",
  "google_logo": "/emojis/google.ico",
  "apple_logo": "/emojis/apple.ico",
  "r_pi": "/emojis/raspi.ico",
  "debian_logo": "/emojis/debian.ico",
  "red_hat_logo": "/emojis/redhat.ico",
  "chromium_logo": "/emojis/chromium.png",
  "podman_logo": "/emojis/podman.webp",
  "deno_logo": "/emojis/deno.svg",
  "github_logo": "/emojis/github.png",
  "rust_logo": "/emojis/rust.png",
  "html_logo": "/emojis/html5.png",
  "css_logo": "/emojis/css.png",
  "fresh_logo": "/emojis/fresh.ico",
  "typescript_logo": "/emojis/ts.png",
  "python_logo": "/emojis/python.png",
  "xfinity_logo": "/emojis/xfinity.ico",
  "tailscale_logo": "/emojis/tail.svg",
  "android_logo": "/emojis/android.png",
  "ms_logo": "/emojis/ms.png",
  "linux_logo": "/emojis/tux.png",
  "vim_logo": "/emojis/vim.gif",
  "discord_logo": "/emojis/discord.svg",
};

const emojiRenderer = (token: EmojiToken) =>
  `<img alt="${token.name}" src="${token.emoji}" class="marked-emoji-img">`

const options: MarkedEmojiOptions = {
  emojis: { ...(gitEmojis as Record<string, string>), ...customEmojis },
  renderer: emojiRenderer
};

// Our own Marked instance, not the shared global one: under `astro dev` this module can be evaluated more than once (HMR, or
// reached through two module paths), and each evaluation would stack another copy of the highlight extension onto the global
// `marked`, so code blocks were highlighted twice and the first pass's HTML showed up as escaped text in the second.
const md = new Marked(
  hlExt,
  {
    renderer: customRenderer,
  },
  markedEmoji(options),
);

export function renderBlogPost(content: string): RendererResult {
  headings.length = 0;

  // A "tags: a, b, c" line anywhere in the post becomes og article:tag metadata and is dropped from the body.
  const tagMatch = content.match(/tags:\s*([^\n]+)/i);
  const tags = tagMatch ? tagMatch[1].split(",").map((tag) => tag.trim()) : [];
  content = content.replace(/tags:\s*([^\n]+)/i, "");

  const renderedContent = md.parse(
    content.replace(/{{(\w+)}}/g, (_match, componentName) => {
      return `<div id="component-${componentName}" data-component="${componentName}"></div>`;
    }),
  );
  headings.unshift({ id: TitleHeaderID, text: "(Top)", level: 0 });
  return {
    html: renderedContent as string,
    // Copy: `headings` is module-level and reset on every call.
    headings: [...headings],
    tags,
  };
}
