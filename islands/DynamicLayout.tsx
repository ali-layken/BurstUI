import { isNarrow } from "../utils/screensize.ts";
import { JSX } from "preact/jsx-runtime";
import SiteNav from "./SiteNav.tsx";
import SiteNavNarrow from "./SiteNavNarrow.tsx";
import { Signal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { LinkList } from "../utils/linklist.ts";

interface DynamicLayoutProps {
  children: ComponentChildren; // Server-rendered content as children
  currentPage: string;
  headingsSignal: Signal<LinkList[]>;
}

export default function DynamicLayout(
  { children, currentPage, headingsSignal }: DynamicLayoutProps,
): JSX.Element {
  switch (isNarrow.value) {
    case true:
      return (
        <div class="min-h-screen w-full bg-bgPurple flex flex-col items-center">
          <div class="flex-2 sticky top-0 z-50 w-full max-w-4xl">
            <SiteNavNarrow currentPage={currentPage} headingsSignal={headingsSignal} />
          </div>
          <div class="flex-1 w-full max-w-4xl px-4 py-8 mt-4 bg-bgAqua rounded-md shadow-lg">
            {children}
          </div>
        </div>
      );
    case false:
      return (
        <div class="min-h-screen bg-bgPurple flex flex-col items-center justify-start">
          <div class="h-12 bg-bgPurple"></div>
          <div class="max-w-full w-full px-4 flex gap-8 justify-center">
            {/* Left Navigation */}
            <div class="flex-2 px-4 py-4 top-24 bg-bgAqua rounded-md shadow-lg self-start sticky flex items-center justify-center">
              <SiteNav currentPage={currentPage} headingsSignal={headingsSignal} />
            </div>
            {/* Main Content */}
            <div class="flex-1 max-w-4xl px-8 py-8 bg-bgAqua rounded-md shadow-lg">
              {children}
            </div>
          </div>
          <div class="h-12 bg-bgPurple"></div>
        </div>
      );
    default:
      return <div class="min-h-screen bg-bgPurple flex flex-col items-center justify-start" />
  }
}
