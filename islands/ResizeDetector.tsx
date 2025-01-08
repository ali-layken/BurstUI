import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

export type ResizeDetectorProps = {
  currentPage: string;
};

enum PageType {
  "/",
  "/blog/:postname",
}

export default function ResizeDetector({ currentPage }: ResizeDetectorProps): JSX.Element {
  if (globalThis.globalThis == undefined) {
    return <></>;
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState(currentPage !== PageType[1]);

  const toggleMenu = () => setIsOpen(!isOpen);

  useEffect(() => {
    const updateScreenSize = () => {
      const narrow = globalThis.globalThis?.innerWidth <= 1422;
      setIsNarrow(narrow);
    };

    updateScreenSize(); // Initial check

    globalThis.globalThis.addEventListener("resize", updateScreenSize);

    return () => globalThis.globalThis.removeEventListener("resize", updateScreenSize);
  }, []);

  useEffect(() => {
    const backgroundDiv = document.getElementById("background-container");
    const wideTopDiv = document.getElementById("wide-top-container");
    const mainDiv = document.getElementById("main-container");
    const wideNavDiv = document.getElementById("wide-nav-container");
    const componentDiv = document.getElementById("component-container");
    const bottomNavDiv = document.getElementById("wide-bottom-or-narrow-nav-container");
    const siteNavDiv = document.getElementById("site-nav-container");

    if (!bottomNavDiv || !siteNavDiv) return;

    if (isNarrow) {
      // Narrow layout adjustments
      backgroundDiv?.classList.remove("justify-start");
      wideTopDiv?.classList.remove("h-12", "bg-bgPurple");
      if (mainDiv) {
        mainDiv.className = "flex-1 w-full max-w-4xl px-5 py-8 bg-bgAqua rounded-md shadow-lg";
      }
      if (wideNavDiv) {
        wideNavDiv.innerHTML = "";
        wideNavDiv.className = "";
      }
      if (componentDiv) {
        componentDiv.className = "";
      }

      // Append siteNavDiv to the narrow navigation
      bottomNavDiv.innerHTML = ""; // Clear previous content
      bottomNavDiv.className =
        "fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl bg-bgPurple opacity-95 rounded-t-lg z-50 transition-transform duration-300";
      bottomNavDiv.appendChild(siteNavDiv); // Move the element
      siteNavDiv.classList.remove("hidden");

      // Handle dropdown toggle state
      bottomNavDiv.insertAdjacentHTML(
        "beforeend",
        `
        <div class="absolute top-[-2.5rem] w-full flex justify-end px-6">
          <button
            class="bg-accRed text-white px-4 py-2 rounded-t-lg"
            onclick="document.querySelector('#wide-bottom-or-narrow-nav-container').classList.toggle('translate-y-full')"
          >
            ${currentPage === PageType[0] ? "≡ Posts" : isOpen ? "⌄" : "⌃"}
          </button>
        </div>
      `,
      );
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
        wideNavDiv.appendChild(siteNavDiv); // Move the element
        siteNavDiv.classList.remove("hidden"); // Make it visible
      }
      if (componentDiv) {
        componentDiv.className = "flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg";
      }

      // Clear narrow navigation
      bottomNavDiv.innerHTML = "";
      bottomNavDiv.className = "h-12 bg-bgPurple";
    }

    globalThis.dispatchEvent(new Event("resize"));
  }, [isNarrow, currentPage, isOpen]);

  return <></>; // No visible output
}
