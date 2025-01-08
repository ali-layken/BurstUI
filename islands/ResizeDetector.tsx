import { Fragment, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

export type ResizeDetectorProps = {
  currentPage: string;
};

export default function ResizeDetector({ currentPage }: ResizeDetectorProps): JSX.Element {
  if (globalThis.globalThis == undefined){
    return <></>
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(false);

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
        bottomNavDiv.classList.add("w-full", "max-w-4xl");
        if (siteNavDiv) {
          bottomNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.classList.remove("hidden"); // Make it visible
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
        wideNavDiv.className = "flex-2 w-[29rem] px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex flex-col";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.classList.remove("hidden"); // Make it visible
        }

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

