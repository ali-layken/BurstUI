import { useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";
import { IndexLink } from "../routes/index.tsx";
import BackButton3D from "./BackButton3D.tsx";
import TableOfContents from "../components/TableOfContents.tsx";
import { HeadingInfo } from "../components/BlogRendererSS.tsx";
import { SiteNavProps } from "./SiteNav.tsx";


export default function SiteNavNarrow({ currentPage, headingsSignal }: SiteNavProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div
      class={`fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-4xl bg-bgPurple opacity-95 rounded-t-lg transition-transform duration-300 ${
        isOpen ? "translate-y-0" : "translate-y-full"
      }`}
    >
      {/* Dropdown Toggle */}
      <div class="absolute top-[-2.5rem] w-full flex justify-end px-6 opacity-55">
        <button
          class="bg-accRed text-white px-4 py-2 rounded-t-lg"
          onClick={toggleMenu}
        >
          {currentPage === "/" && "≡ Posts"}
          {currentPage.startsWith("/blog") && headingsSignal.value.length > 0 && (isOpen ? "⌄" : "⌃")}
        </button>
      </div>

      {/* Drop-Up Content */}
      <div class="p-4 shadow-lg">
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



