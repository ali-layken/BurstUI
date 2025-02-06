import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { isNarrowSignal } from "../utils/signals.tsx";



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
          `fixed border-t-4 border-l-2 border-r-2 border-accRed3 shadow-lg transform w-full -bottom-full max-w-4xl bg-bgAqua2 rounded-t-lg z-50 transition-transform duration-300
          ${isOpen ? "-translate-y-full" : "-translate-y-[4.2rem]"}`;
        bottomNavDiv.onclick = handleSiteNavigation;
        // Add toggle button
        const toggleButton = document.createElement("div");
        toggleButton.className =
          "absolute -top-10 w-full flex justify-end px-6";
        const button = document.createElement("button");
        button.className =
          "hover:bg-accRed2 bg-accRed3 text-white px-4 py-2 rounded-t-lg";
        button.innerText = isOpen ? "⌄" : "⌃";
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
          "flex-2 w-[31rem] px-4 py-5 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex flex-col";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.className = "";
        }
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
