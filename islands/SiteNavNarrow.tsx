import { useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { Signal } from "@preact/signals";
import { LinkList } from "../utils/linklist.ts";
import { IndexLink } from "../routes/index.tsx";
import BackButton3D from "./BackButton3D.tsx";
import TableOfContents from "../components/TableOfContents.tsx";
import { HeadingInfo } from "../components/BlogRendererSS.tsx";

type SiteNavNarrowProps = {
  currentPage: string;
  headingsSignal: Signal<LinkList[]>;
};

export default function SiteNavNarrow({ currentPage, headingsSignal }: SiteNavNarrowProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div class="bg-bgAqua p-4 shadow-lg">
      {/* Dropdown Toggle */}
      <button
        class="flex items-center space-x-2 bg-bgPurple text-white px-4 py-2 rounded-md"
        onClick={toggleMenu}
      >
        <span class="text-xl">☰</span>
        <span class="text-sm font-bold">Menu</span>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <ul class="mt-4 space-y-2">
          {currentPage === "/" &&
            (headingsSignal.value as IndexLink[]).map((post, index) => (
              <li key={post.name} class="text-sm text-white">
                <a href={`/blog/${post.name}`} class="hover:text-accGreen">
                  {index + 1}. {post.name.replace(/_/g, " ")}
                </a>
              </li>
            ))}
          {currentPage.startsWith("/blog") && headingsSignal.value.length > 0 && (
            <div>
              <TableOfContents headings={headingsSignal.value as HeadingInfo[]} />
              <div class="flex items-center justify-center pt-2 pb-6">
                <BackButton3D />
              </div>
            </div>
          )}
        </ul>
      )}
    </div>
  );
}
