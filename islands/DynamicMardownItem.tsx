import { useEffect } from "preact/hooks";
import SpinningCube from "./SpinningCube.tsx";
import { JSX } from "preact/jsx-runtime";
import { render } from "preact";

const componentMap: Record<string, () => JSX.Element> = {
  SpinningCube
};

export default function DynamicMarkdownItem() {
  useEffect(() => {
    // Find placeholders and render corresponding components dynamically
    const placeholders = document.querySelectorAll("[data-component]");
    placeholders.forEach((placeholder) => {
      const componentName = placeholder.getAttribute("data-component");
      const Component = componentMap[componentName || ""];
      if (Component) {
        const container = document.createElement("div");
        placeholder.appendChild(container);
        render(<Component />, container);
      }
    });
  }, []);

  return null; // No visible output; only mounts components dynamically
}
