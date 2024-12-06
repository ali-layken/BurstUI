import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { render } from "preact";

type ComponentCache = Record<string, JSX.Element>;

export default function DynamicMarkdownItem() {
  const [cache, setCache] = useState<ComponentCache>({});

  useEffect(() => {
    const placeholders = document.querySelectorAll("[data-component]");

    placeholders.forEach(async (placeholder) => {
      const componentName = placeholder.getAttribute("data-component");
      if (!componentName) return;

      // Skip rendering if the placeholder is already filled
      if (placeholder.hasChildNodes()) return;

      // If component is cached, render it
      if (cache[componentName]) {
        renderComponent(placeholder, cache[componentName]);
        return;
      }

      // Dynamically import the island and cache it
      try {
        const module = await import(`../islands/${componentName}.tsx`);
        const Component = module.default;

        if (Component) {
          const element = <Component />;
          setCache((prevCache) => ({ ...prevCache, [componentName]: element }));
          renderComponent(placeholder, element);
        }
      } catch (error) {
        console.error(`Failed to load component: ${componentName}`, error);
      }
    });
  }, [cache]);

  const renderComponent = (placeholder: Element, Component: JSX.Element) => {
    render(Component, placeholder);
  };

  return null;
}
