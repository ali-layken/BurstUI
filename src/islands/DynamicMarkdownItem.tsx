import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import CopyableCodeBlock from "./CopyableCodeBlock.tsx";
import { burstColors } from "../lib/colors";

// Islands a post can drop in with {{ ComponentName }} - resolved to a lazy
// chunk per file so only what a post actually uses gets downloaded.
const islandModules = import.meta.glob<{ default: () => JSX.Element }>("./*.tsx");

// Mermaid is big and only needed by posts that have a ```mermaid block, so
// it stays a CDN import fetched on demand (the @vite-ignore keeps Vite from
// trying to bundle a URL).
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
let mermaidPromise: Promise<any> | null = null;
const loadMermaid = () => {
  mermaidPromise ??= import(/* @vite-ignore */ MERMAID_URL).then((m) => m.default);
  return mermaidPromise;
};

export default function DynamicMarkdownItem() {
  const cache = useRef<Record<string, JSX.Element>>({}); // Use useRef for caching

  useEffect(() => {
    const placeholders = document.querySelectorAll("[data-component]");
    let runMermaid = true;

    const hydrateComponents = async () => {
      await Promise.all(
        Array.from(placeholders).map(async (placeholder) => {
          const componentName = placeholder.getAttribute("data-component");
          if (!componentName) return;

          // Skip rendering if already hydrated
          if (placeholder.getAttribute("data-hydrated") === "true") return;
          placeholder.setAttribute("data-hydrated", "true");

          // CopyableCodeBlock logic
          if (componentName === "CopyableCodeBlock") {
            const container = document.createElement("div");
            const lang = placeholder.getAttribute("data-lang") || "plaintext";
            const code = decodeURIComponent(
              placeholder.getAttribute("data-code") || "",
            );
            placeholder.parentElement!.parentElement!.appendChild(container);
            render(<CopyableCodeBlock lang={lang} code={code} />, container);
            return;
          }

          // MermaidBlock logic
          if (componentName === "MermaidBlock") {
            placeholder.classList.remove("invisible");
            if (runMermaid) {
              runMermaid = false;

              const mermaid = await loadMermaid();
              mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                securityLevel: 'loose',
                themeVariables: {
                  fontFamily: "Fixel",
                  fontSize: "1.3em",
                  textColor: burstColors.subtitles2,
                  pieLegendTextColor: burstColors.creamTan2,
                },
              });

              await mermaid.run();
            }
            placeholder.classList.remove("invisible");
            return;
          }

          // Dynamic component import logic
          if (cache.current[componentName]) {
            render(cache.current[componentName], placeholder);
            return;
          }

          try {
            const loader = islandModules[`./${componentName}.tsx`];
            if (!loader) throw new Error(`no island named ${componentName}`);
            const module = await loader();
            const Component = module.default;

            if (Component) {
              const element = <Component />;
              cache.current[componentName] = element;
              render(element, placeholder);
            }
          } catch (error) {
            console.error(`Failed to load component: ${componentName}`, error);
          }
        }),
      );
    };

    const mermaidBlocks = document.querySelectorAll("[data-component='MermaidBlock']");

    const rerenderMermaid = async () => {
        for (const block of mermaidBlocks) {
          if (block instanceof HTMLElement) {
            const parent = block.parentElement!;
            const originalHeight = parent.clientHeight;
    
            parent.style.height = `${originalHeight}px`;
            if (parent.clientHeight < 10) {
              console.warn("Skipping Mermaid render: Parent container too small", parent);
              continue;
            }
            parent.style.opacity = "0";
    
            // Prepare the block for rendering
            block.removeAttribute("data-processed");
            const code = decodeURIComponent(block.getAttribute("data-code") || "");
            block.style.color = burstColors.bgAqua; // Hide text visually
            block.innerHTML = code;
            block.style.visibility = "hidden";
    
            // Wait for Mermaid to render the diagrams
            const mermaid = await loadMermaid();
            await mermaid.run({
              querySelector: `[data-component='MermaidBlock']`,
            });

            parent.style.height = "auto";
            setTimeout(() => {
              parent.style.opacity = "1";
              block.style.visibility = "visible";
            }, 300)
          } else {
            console.warn("Skipped rendering for a non-HTMLElement or non-code parent:", block);
          }
      }
    };

    let mermaidTimer: ReturnType<typeof setTimeout> | undefined;
    const mermaidRerenderTrigger = async () => {
      for (const block of mermaidBlocks) {
        if (block instanceof HTMLElement) {
          block.parentElement!.style.opacity = "0";
          block.style.visibility = "hidden";
        } else {
          console.warn("Skipped rendering for a non-HTMLElement or non-code parent:", block);
        }
    }
      clearTimeout(mermaidTimer);
      mermaidTimer = setTimeout(rerenderMermaid, 500);
    }

    const restoreScrollPosition = () => {
      const hash = globalThis.location.hash;
      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    
    // Run hydration initially
    hydrateComponents().then(restoreScrollPosition);
    
    // Add a resize listener to re-render Mermaid diagrams
    globalThis.addEventListener("resize", mermaidRerenderTrigger);
    
    return () => {
      globalThis.removeEventListener("resize", mermaidRerenderTrigger);
    };
  }, []);

  return null;
}
