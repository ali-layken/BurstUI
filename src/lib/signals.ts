import { signal } from "@preact/signals";

/** True when the viewport is narrower than the `md` breakpoint (1463px). */
export const isNarrowSignal = signal<boolean>(false);
