import { Signal, signal } from "@preact/signals";
import { IndexLink } from "../routes/index.tsx";
import { HeadingInfo } from "../components/BlogRendererSS.tsx";

export type LinkList = IndexLink | HeadingInfo

export const linklist = signal<LinkList[]>([]);
export const isNarrowSig: Signal<undefined> | Signal<boolean> = signal<undefined>(undefined);