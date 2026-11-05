/**
 * The one layout breakpoint: Tailwind's `md` (tailwind.config.ts), styles.css's media queries and the JS layout switch
 * (ResizeDetector, oceanSpin) all read it from here so they can never drift apart.
 */
export const MD_PX = 1463;

/** True when the viewport is narrower than `md` (the sidebar lives in the bottom drawer). */
export const isNarrowWidth = () => globalThis.innerWidth < MD_PX;
