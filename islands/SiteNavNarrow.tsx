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
    <div class="bg-bgAqua p-4 shadow-lg relative"> {/* Add relative positioning */}
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
        <ul
          class="absolute left-0 mt-2 w-full bg-bgAqua rounded-md shadow-lg z-50 space-y-2 p-4"
        >
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
                      class="hover:text-accGreen hover:underline transition-colors duration-200"
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
      )}
    </div>
  );
}

