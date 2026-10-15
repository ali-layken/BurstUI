/** Viewport width (CSS px) at or below which the sidebar moves into the bottom drawer.
 *  Sidebar (24rem) + gap + a content column that is allowed to shrink fit above this;
 *  Windows display scaling (125-150%) lands maximized windows around 1280-1536. */
export const NARROW_MAX_WIDTH = 1280;

import { signal } from "@preact/signals";

/** True when the viewport is at or below NARROW_MAX_WIDTH. */
export const isNarrowSignal = signal<boolean>(false);
