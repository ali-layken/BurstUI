
import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import SiteNav, { SiteNavProps } from "./SiteNav.tsx";
import SiteNavNarrow from "./SiteNavNarrow.tsx";
import { Fragment, render } from "preact";

interface ResizeDetectorProps extends SiteNavProps {
  isNarrowCookie: boolean | undefined
}

export default function ResizeDetector({ currentPage, headingsSignal, isNarrowCookie }: ResizeDetectorProps): JSX.Element {
  if (globalThis.window == undefined){
    return <></>
  }

  const [isNarrow, setIsNarrow] = useState<boolean | undefined>(isNarrowCookie);

  useEffect(() => {
    const updateScreenSize = () => {
      const narrow = globalThis.window?.innerWidth <= 1371;
      setIsNarrow(narrow);
      document.cookie = `isNarrow=${narrow}; path=/; max-age=31536000;`;
    };

    updateScreenSize(); // Initial check
    
    globalThis.window.addEventListener("resize", updateScreenSize);

    return () => globalThis.window.removeEventListener("resize", updateScreenSize);
  }, []);

  useEffect(() => {
    const backgroundDiv = document.getElementById("background-container");
    const wideTopDiv = document.getElementById("wide-top-container");
    const mainDiv = document.getElementById("main-container");
    const wideNavDiv = document.getElementById("wide-nav-container");
    const componentDiv = document.getElementById("component-container");
    const bottomNavDiv = document.getElementById("wide-bottom-or-narrow-nav-container");
  
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
      if (bottomNavDiv) {
        bottomNavDiv.classList.remove("h-12", "bg-bgPurple");
        bottomNavDiv.classList.add("w-full", "max-w-4xl")
        render(<SiteNavNarrow currentPage={currentPage} headingsSignal={headingsSignal} />, bottomNavDiv);
      }
    } else {
      // Wide layout adjustments
      backgroundDiv?.classList.add("justify-start");
      wideTopDiv?.classList.add("h-12", "bg-bgPurple");
      if (mainDiv) {
        mainDiv.className = "max-w-full w-full px-5 flex gap-8 justify-center";
      }
      if (wideNavDiv) {
        wideNavDiv.className = "flex-2 min-w-80 px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex items-center justify-center";
        render(
            <SiteNav currentPage={currentPage} headingsSignal={headingsSignal} />,
            wideNavDiv)
      }
      if (componentDiv) {
        componentDiv.className = "flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg";
      }
      if(bottomNavDiv) {
        render(<Fragment />, bottomNavDiv);
        bottomNavDiv.classList.remove("w-full", "max-w-4xl");
        bottomNavDiv.classList.add("h-12", "bg-bgPurple");
      };
    }
    globalThis.dispatchEvent(new Event("resize"));
  }, [isNarrow, currentPage]);
  
  return <></>; // No visible output
}

