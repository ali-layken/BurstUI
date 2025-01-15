import { render } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import CopyableCodeBlock from "./CopyableCodeBlock.tsx";
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
import { burstColors } from "../static/colors.ts";

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

              mermaid.initialize({
                startOnLoad: false,
                theme: "dark",
                themeVariables: {
                  fontFamily: "Fixel",
                  fontSize: "1.3em",
                  textColor: burstColors.subtitles2,
                  pieLegendTextColor: burstColors.creamTan2,
                },
              });

              await mermaid.run();
            }
            return;
          }

          // Dynamic component import logic
          if (cache.current[componentName]) {
            render(cache.current[componentName], placeholder);
            return;
          }

          try {
            const module = await import(`../islands/${componentName}.tsx`);
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

    const rerenderMermaid = () => {
      // Find all Mermaid diagrams and trigger re-render
      const mermaidBlocks = document.querySelectorAll("[data-component='MermaidBlock']");
      if (mermaidBlocks.length > 0) {
        // Remove the 'data-processed' attribute to reset Mermaid charts
        mermaidBlocks.forEach((block) => {
          block.removeAttribute('data-processed');
        });
        
        // Reinitialize and trigger Mermaid re-rendering
        mermaid.contentLoaded();
      }
    };

    // Run hydration initially
    hydrateComponents();

    // Add a resize listener to re-render Mermaid diagrams
    globalThis.addEventListener("resize", rerenderMermaid);

    return () => {
      globalThis.removeEventListener("resize", rerenderMermaid);
    };
  }, []);

  return null;
}
