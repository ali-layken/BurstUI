import { signal } from "@preact/signals";

/** True when the viewport is narrower than `md` (src/lib/breakpoint.ts). Set by ResizeDetector. */
export const isNarrowSignal = signal<boolean>(false);
