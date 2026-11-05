import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import { isNarrowSignal } from "../lib/signals";



export default function ResizeDetector(): JSX.Element {
  if (typeof globalThis === "undefined") {
    return <></>;
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(
    globalThis.innerWidth <= 1463,
  );

  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () =>
    setIsOpen((prev) => {
      return !prev;
    });

  useEffect(() => {
    const updateScreenSize = () => {
      const narrow = globalThis.innerWidth <= 1463;
      setIsNarrow(narrow);
      isNarrowSignal.value = narrow;
    };

    globalThis.addEventListener("resize", updateScreenSize);

    return () => {
      globalThis.removeEventListener("resize", updateScreenSize);
    };
  }, []);

  useEffect(() => {
    const wideNavDiv = document.getElementById("wide-nav-container");
    const bottomNavDiv = document.getElementById(
      "wide-bottom-or-narrow-nav-container",
    );
    const siteNavDiv = document.getElementById("site-nav-container");

    const handleSiteNavigation = (event: any) => {
      const action = event.target.dataset.action;
      if (action === "toggle") {
        toggleMenu();
      }

      if (action === "close") {
        setIsOpen(false);
      }
    };

    if (isNarrow) {
      if (wideNavDiv) {
        wideNavDiv.innerHTML = "";
        wideNavDiv.className = "hidden";
      }
      if (bottomNavDiv) {
        // Configure bottom nav with initial state offscreen
        bottomNavDiv.innerHTML = ""; // Clear previous content
        bottomNavDiv.className =
          `fixed border-t-4 border-l-2 border-r-2 border-accRed3 shadow-lg top-[calc(100%+2.5rem)] transform w-full max-w-4xl bg-bgAqua2 rounded-t-lg z-50 transition-transform duration-300 ${
            isOpen ? "-translate-y-[calc(100%+2.5rem)]" : "-translate-y-10"
          }`;
        bottomNavDiv.onclick = handleSiteNavigation;
        // Add toggle button
        const toggleButton = document.createElement("div");
        // A floating circle that rides on top of the drawer: ~20px above its top edge and 24px in from the right, so while
        // the drawer is closed it sits inside the wire frame's double line in the bottom-right corner.
        toggleButton.className =
          "absolute -top-[4.5rem] w-full flex justify-end px-6 pointer-events-none";
        const button = document.createElement("button");
        button.className =
          "pointer-events-auto hover:bg-accRed2 bg-accRed3 text-white w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-xl leading-none";
        button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
        // Same up/down swap as before, but drawn as one glyph flipped, since "⌄" sits lower and smaller than "⌃". The glyph
        // sits ~2.5px above centre in its line box, so nudge it back (after the flip, for the open state).
        button.innerHTML = `<span class="${isOpen ? "rotate-180 -translate-y-[2.5px]" : "translate-y-[2.5px]"} inline-block pointer-events-none">⌃</span>`;
        button.setAttribute("data-action", "toggle");
        toggleButton.appendChild(button);
        bottomNavDiv.appendChild(toggleButton);

        if (siteNavDiv) {
          bottomNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.classList.remove("hidden");
          siteNavDiv.classList.add("px-6", "py-8");
        }
      }
    } else {
      if (wideNavDiv) {
        wideNavDiv.className =
          "flex-2 w-[31rem] px-4 py-5 top-24 rounded-md self-start sticky flex flex-col wire-frame";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.className = "";
        }
      }
      if (bottomNavDiv) {
        // Clear narrow navigation
        bottomNavDiv.innerHTML = "";
        bottomNavDiv.className = "h-12";
      }
    }

    globalThis.dispatchEvent(new Event("resize"));
  }, [isNarrow, isOpen]);

  return <></>; // No visible output
}
