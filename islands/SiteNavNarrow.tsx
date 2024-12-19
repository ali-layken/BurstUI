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
    <div class="fixed bottom-0 w-full max-w-4xl mx-auto bg-bgPurple">
      {/* Dropdown Toggle */}
      <div class="flex justify-end py-4 px-8">
        <button
          class="bg-bgPurple text-white px-4 py-2 rounded-md"
          onClick={toggleMenu}
        >
          {isOpen ? "⌄" : "⌃"}
        </button>
      </div>

      {/* Drop-Up Content */}
      <div
        class={`absolute bottom-full left-0 w-full bg-bgPurple rounded-t-md z-50 space-y-2 p-4 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <ul>
          {currentPage === "/" &&
            (headingsSignal.value as IndexLink[]).map((post, index) => {
              const isEven = index % 2 === 0;
              return (
                <li
                  key={post.name}
                  class={`flex justify-between items-center w-full text-sm ${
                    isEven ? "text-subtitles" : "text-accYellow"
                  }`}
                >
                  {/* Left Section: Post Number and Name */}
                  <div class="flex items-baseline space-x-2">
                    <span class="font-bold">{index + 1}.</span>
                    <a
                      href={`/blog/${post.name}`}
                      class="text-accGreen hover:text-accRed hover:underline transition-colors duration-200"
                      onClick={() => setIsOpen(false)} // Close menu on click
                    >
                      {post.name.replace(/_/g, " ")}
                    </a>
                  </div>

                  {/* Right Section: Timestamp */}
                  <time class="text-xs ml-4 mt-1">
                    {new Date(post.createdAt).toLocaleString()}
                  </time>
                </li>
              );
            })}
          {currentPage.startsWith("/blog") && headingsSignal.value.length > 0 && (
            <div>
              <TableOfContents
                headings={headingsSignal.value as HeadingInfo[]}
                onLinkClick={() => setIsOpen(false)} // Close the menu on link click
              />
              <div class="flex items-center justify-center pt-2 pb-6">
                <BackButton3D />
              </div>
            </div>
          )}
        </ul>
      </div>
    </div>
  );
}


