import { signal } from "@preact/signals";

/** True when the viewport is at or below the `md` breakpoint (1463px). */
export const isNarrowSignal = signal<boolean>(false);
