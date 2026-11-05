import { useEffect, useState } from "preact/hooks";
import type { JSX } from "preact/jsx-runtime";
import { isNarrowSignal } from "../lib/signals";

/** Narrow below Tailwind's md (tailwind.config.ts: min-width 1463px), so this and the CSS switch at the same width. */
const isNarrowWidth = () => globalThis.innerWidth < 1463;

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

/**
 * Soft-fade the drawer sidebar's edges where there's more to scroll (styles.css .drawer-scroll.more-above/-below):
 * the scrollbar is hidden, so this is the hint that the list continues.
 */
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

export default function ResizeDetector(): JSX.Element {
  if (typeof globalThis === "undefined") {
    return <></>;
  }

  const [isNarrow, setIsNarrow] = useState<boolean>(isNarrowWidth());

  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () =>
    setIsOpen((prev) => {
      return !prev;
    });

  useEffect(() => {
    lastNarrow ??= isNarrowWidth();
    const updateScreenSize = () => {
      const narrow = isNarrowWidth();
      animateBreakpointSwap(narrow);
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
        // Styled by .drawer-toggle* in styles.css rather than Tailwind classes built here: in `astro dev`, classes that only
        // appear in this file can be missing from the CSS that client-side navigation swaps in, which hid the button.
        toggleButton.className = "drawer-toggle-row";
        const button = document.createElement("button");
        button.className = "drawer-toggle";
        button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
        // Same up/down swap as before, but drawn as one glyph flipped, since "⌄" sits lower and smaller than "⌃". The glyph
        // sits ~2.5px above centre in its line box, so nudge it back (after the flip, for the open state).
        button.innerHTML = `<span class="drawer-toggle-arrow${isOpen ? " open" : ""}">⌃</span>`;
        button.setAttribute("data-action", "toggle");
        toggleButton.appendChild(button);
        bottomNavDiv.appendChild(toggleButton);

        if (siteNavDiv) {
          bottomNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.classList.remove("hidden");
          siteNavDiv.classList.add("px-6", "py-8", "drawer-scroll");
          watchScrollFades(siteNavDiv, true);
        }
      }
    } else {
      if (wideNavDiv) {
        wideNavDiv.className =
          "flex-2 w-[31rem] px-4 py-5 top-24 rounded-md self-start sticky flex flex-col wire-frame";
        if (siteNavDiv) {
          wideNavDiv.appendChild(siteNavDiv); // Move the element
          siteNavDiv.className = "";
          watchScrollFades(siteNavDiv, false);
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
