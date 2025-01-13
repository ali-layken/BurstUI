import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import CopyableCodeBlock from "./CopyableCodeBlock.tsx";
//import mermaid from "mermaid";
import { burstColors, burstTextColors } from "../static/colors.ts";



type ComponentCache = Record<string, JSX.Element>;

export default function DynamicMarkdownItem() {
  const [cache, setCache] = useState<ComponentCache>({});

  useEffect(() => {
    const placeholders = document.querySelectorAll("[data-component]");
    let runMermaid = true;

    placeholders.forEach(async (placeholder) => {
      const componentName = placeholder.getAttribute("data-component");
      if (!componentName) return;

      // Skip rendering if the placeholder is already filled
      if (placeholder.getAttribute("data-hydrated") === "true") return;
      placeholder.setAttribute("data-hydrated", "true");

      // Special case for `CopyableCodeBlock`
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

      // Special case for Mermaid diagrams
      if (componentName === "MermaidBlock") {
        placeholder.classList.remove("invisible");
        if(runMermaid){
          /*mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              fontFamily: "Fixel",
              textColor: burstColors.subtitles2,
              pieLegendTextColor: burstColors.creamTan2,
              
            }
          });
          mermaid.run();*/
          runMermaid = false;
        }
      }

      // Dynamic import for other components
      if (cache[componentName]) {
        render(cache[componentName], placeholder);
        return;
      }

      try {
        const module = await import(`../islands/${componentName}.tsx`);
        const Component = module.default;

        if (Component) {
          const element = <Component />;
          setCache((prevCache) => ({ ...prevCache, [componentName]: element }));
          render(element, placeholder);
        }
      } catch (error) {
        console.error(`Failed to load component: ${componentName}`, error);
      }
    });
  }, [cache]);

  return null;
}
