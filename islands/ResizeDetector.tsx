import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

export default function ResizeDetector(): JSX.Element {
  if (typeof globalThis === "undefined") {
    return <></>;
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const updateScreenSize = () => {
      const narrow = globalThis.innerWidth <= 1422;
      setIsNarrow(narrow);
    };

    updateScreenSize(); // Initial check

    globalThis.addEventListener("resize", updateScreenSize);

    return () => {
      globalThis.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  useEffect(() => {
    const backgroundDiv = document.getElementById("background-container");
    const wideTopDiv = document.getElementById("wide-top-container");
    const mainDiv = document.getElementById("main-container");
    const wideNavDiv = document.getElementById("wide-nav-container");
    const componentDiv = document.getElementById("component-container");
    const bottomNavDiv = document.getElementById("wide-bottom-or-narrow-nav-container");
    const siteNavDiv = document.getElementById("site-nav-container");

    if (isNarrow) {
      // Narrow layout adjustments
      backgroundDiv?.classList.remove("justify-start");
      wideTopDiv?.classList.remove("h-12", "bg-bgPurple");
      if (mainDiv) {
        mainDiv.className =
          "flex-1 w-full max-w-4xl px-5 py-8 bg-bgAqua rounded-md shadow-lg";
      }
      if (wideNavDiv) {
        wideNavDiv.innerHTML = "";
        wideNavDiv.className = "";
      }
      if (componentDiv) {
        componentDiv.className = "";
      }
      if (bottomNavDiv) {
        // Configure bottom nav with initial state offscreen
        bottomNavDiv.innerHTML = ""; // Clear previous content
        bottomNavDiv.className =
          `fixed top-[calc(100%+2.5rem)] transform w-full max-w-4xl bg-bgPurple opacity-95 rounded-t-lg z-50 transition-transform duration-300 ${isOpen ? "-translate-y-[calc(100%+2.5rem)]" : "-translate-y-10"}`;

        // Add toggle button
        const toggleButton = document.createElement("div");
        toggleButton.className = "absolute -top-10 w-full flex justify-end px-6";
        const button = document.createElement("button");
        button.className = "bg-accRed text-white px-4 py-2 rounded-t-lg";
        button.innerText = isOpen ? "⌄" : "⌃";
        button.onclick = toggleMenu;
        toggleButton.appendChild(button);
        bottomNavDiv.appendChild(toggleButton);

        if (siteNavDiv) {
          bottomNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.classList.remove("hidden");
          siteNavDiv.classList.add("px-4", "py-6");
        }
      }
    } else {
      // Wide layout adjustments
      backgroundDiv?.classList.add("justify-start");
      wideTopDiv?.classList.add("h-12", "bg-bgPurple");
      if (mainDiv) {
        mainDiv.className = "max-w-full w-full px-5 flex gap-8 justify-center";
      }
      if (wideNavDiv) {
        wideNavDiv.className =
          "flex-2 w-[29rem] px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex flex-col";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.className = "";
        }
      }
      if (componentDiv) {
        componentDiv.className =
          "flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg";
      }
      if (bottomNavDiv) {
        // Clear narrow navigation
        bottomNavDiv.innerHTML = "";
        bottomNavDiv.className = "h-12 bg-bgPurple";
      }
    }

    globalThis.dispatchEvent(new Event("resize"));
  }, [isNarrow, isOpen]);

  return <></>; // No visible output
}
