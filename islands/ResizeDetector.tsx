import { useEffect } from "preact/hooks";
import { isNarrow } from "../utils/screensize.ts";

export default function ResizeDetector(): null {
  useEffect(() => {
    const updateScreenSize = () => {
      isNarrow.value = globalThis.window.innerWidth <= 1371; // Adjust breakpoint as needed
    };

    updateScreenSize(); // Initial check

    globalThis.window.addEventListener("resize", updateScreenSize);

    return () => globalThis.window.removeEventListener("resize", updateScreenSize);
  }, []);

  return null; // No visible output
}
