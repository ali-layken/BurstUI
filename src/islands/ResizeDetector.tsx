import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import { isNarrowWidth } from "../lib/breakpoint";
import { isNarrowSignal } from "../lib/signals";

// Module-level (shared by every ResizeDetector instance, including ones left over from earlier client-side
// navigations) so a breakpoint crossing animates once.
let lastNarrow: boolean | undefined;

/**
 * The CSS layout swaps instantly at the breakpoint (media queries), so fade the page content back in when the window
 * crosses it: the new layout dissolves in over the ocean instead of snapping. Opacity only - a transform or filter on
 * this ancestor would re-anchor its fixed/absolute children (drawer, contact block) mid-animation. Called from the
 * resize event, which runs before the frame is painted, so the swapped layout is never shown at full opacity first.
 */
function animateBreakpointSwap(narrow: boolean) {
  const changed = lastNarrow !== undefined && lastNarrow !== narrow;
  lastNarrow = narrow;
  if (!changed || globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  document.getElementById("background-container")?.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 350,
    easing: "ease-out",
  });
}

/** Toggle the drawer sidebar's edge fades (styles.css .drawer-scroll.more-above / .more-below). */
function updateScrollFades(el: HTMLElement) {
  const more = el.scrollHeight - el.clientHeight;
  el.classList.toggle("more-above", more > 1 && el.scrollTop > 1);
  el.classList.toggle("more-below", more > 1 && el.scrollTop < more - 1);
}
const fadeObservers = new WeakMap<HTMLElement, ResizeObserver>();
function watchScrollFades(el: HTMLElement, on: boolean) {
  fadeObservers.get(el)?.disconnect();
  fadeObservers.delete(el);
  el.onscroll = null;
  if (!on) return;
  el.onscroll = () => updateScrollFades(el);
  const ro = new ResizeObserver(() => updateScrollFades(el)); // first callback runs right away
  ro.observe(el);
  fadeObservers.set(el, ro);
}

/**
 * Moves the sidebar (#site-nav-container) between the wide layout's sticky column and the narrow layout's bottom
 * drawer, and builds the drawer and its toggle. Renders nothing itself. Styles live in styles.css (.drawer*) rather
 * than Tailwind classes built here: under `astro dev`, classes that only appear in this file can be missing from the
 * CSS that client-side navigation swaps in.
 */
export default function ResizeDetector(): JSX.Element {
  const [isNarrow, setIsNarrow] = useState<boolean>(isNarrowWidth());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    lastNarrow ??= isNarrowWidth();
    const updateScreenSize = () => {
      const narrow = isNarrowWidth();
      animateBreakpointSwap(narrow);
      setIsNarrow(narrow);
      isNarrowSignal.value = narrow;
    };
    globalThis.addEventListener("resize", updateScreenSize);
    return () => globalThis.removeEventListener("resize", updateScreenSize);
  }, []);

  useEffect(() => {
    const wideNavDiv = document.getElementById("wide-nav-container");
    const drawer = document.getElementById("wide-bottom-or-narrow-nav-container");
    const siteNavDiv = document.getElementById("site-nav-container");

    // Clicks inside the drawer: the toggle flips it; links (data-action="close") shut it.
    const handleSiteNavigation = (event: Event) => {
      const action = (event.target as HTMLElement).dataset.action;
      if (action === "toggle") setIsOpen((prev) => !prev);
      if (action === "close") setIsOpen(false);
    };

    if (isNarrow) {
      if (wideNavDiv) {
        wideNavDiv.innerHTML = "";
        wideNavDiv.className = "hidden";
      }
      if (drawer) {
        drawer.innerHTML = "";
        drawer.className = `drawer${isOpen ? " open" : ""}`;
        drawer.onclick = handleSiteNavigation;

        const toggleRow = document.createElement("div");
        toggleRow.className = "drawer-toggle-row";
        const button = document.createElement("button");
        button.className = "drawer-toggle";
        button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
        button.setAttribute("data-action", "toggle");
        button.innerHTML = `<span class="drawer-toggle-arrow${isOpen ? " open" : ""}">⌃</span>`;
        toggleRow.appendChild(button);
        drawer.appendChild(toggleRow);

        if (siteNavDiv) {
          drawer.appendChild(siteNavDiv);
          siteNavDiv.classList.remove("hidden");
          siteNavDiv.classList.add("px-6", "py-8", "drawer-scroll");
          watchScrollFades(siteNavDiv, true);
        }
      }
    } else {
      if (wideNavDiv) {
        wideNavDiv.className = "flex wide-nav";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv);
          siteNavDiv.className = "";
          watchScrollFades(siteNavDiv, false);
        }
      }
      if (drawer) {
        drawer.innerHTML = "";
        drawer.className = "h-12";
      }
    }

    // Islands inside the moved sidebar (BackButton3D, the 3D title) re-measure on resize.
    globalThis.dispatchEvent(new Event("resize"));
  }, [isNarrow, isOpen]);

  return <></>;
}
