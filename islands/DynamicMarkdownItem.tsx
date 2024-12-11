import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { render } from "preact";
import CopyableCodeBlock from "./CopyableCodeBlock.tsx";


type ComponentCache = Record<string, JSX.Element>;

export default function DynamicMarkdownItem() {
  const [cache, setCache] = useState<ComponentCache>({});

  useEffect(() => {
    const placeholders = document.querySelectorAll("[data-component]");

    placeholders.forEach(async (placeholder) => {
      const componentName = placeholder.getAttribute("data-component");
      if (!componentName) return;

      // Skip rendering if the placeholder is already filled
      if (placeholder.getAttribute("data-hydrated") === "true") return;
      placeholder.setAttribute("data-hydrated", "true");

      // Special case for `CopyableCodeBlock`
      if (componentName === "CopyableCodeBlock") {
        const lang = placeholder.getAttribute("data-lang") || "plaintext";
        const code = decodeURIComponent(placeholder.getAttribute("data-code") || "");
        render(<CopyableCodeBlock lang={lang} code={code} />, placeholder);
        return;
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
          render(element, placeholder,);
        }
      } catch (error) {
        console.error(`Failed to load component: ${componentName}`, error);
      }
    });
  }, [cache]);



  return null;
}
