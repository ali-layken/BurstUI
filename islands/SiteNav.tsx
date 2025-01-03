import { JSX } from "preact/jsx-runtime";
import { Signal } from "@preact/signals";
import { LinkList } from "../utils/linklist.ts";
import { IndexLink } from "../routes/index.tsx";
import BackButton3D from "./BackButton3D.tsx";
import TableOfContents from "../components/TableOfContents.tsx";
import { HeadingInfo } from "../components/BlogRendererSS.tsx";

export type SiteNavProps = {
  currentPage: string;
  headingsSignal: Signal<LinkList[]>;
};

export enum PageType {
  "/",
  "/blog/:postname",
}


export default function SiteNav(
  { currentPage, headingsSignal }: SiteNavProps,
): JSX.Element {
  switch (currentPage) {
    case PageType[0]:
      return (
        <ul class="space-y-4">
          {(headingsSignal.value as IndexLink[]).map((post, index) => {
            const isEven = index % 2 === 0;
            return (
              <li
                key={post.name}
                class="flex justify-between items-center w-full"
              >
                {/* Left Section: Post Number and Name */}
                <div class="flex items-baseline space-x-2">
                  <span
                    class={`text-lg font-bold ${
                      isEven ? "text-subtitles" : "text-accYellow"
                    }`}
                  >
                    {index + 1}.
                  </span>
                  <a
                    href={`/blog/${post.name}`}
                    class="text-accGreen hover:text-accRed hover:underline text-base transition-colors duration-200"
                  >
                    {post.name.replace(/_/g, " ")}
                  </a>
                </div>

                {/* Right Section: Timestamp */}
                <time
                  class={`text-xs ${
                    isEven ? "text-subtitles" : "text-accYellow"
                  } ml-4 mt-1`}
                >
                  {new Date(post.modifiedAt).toLocaleString()}
                </time>
              </li>
            );
          })}
        </ul>
      );
    case PageType[1]:
      return (headingsSignal.value.length
        ? (
          <div>
            <TableOfContents headings={headingsSignal.value as HeadingInfo[]} />
            <div class="flex items-center justify-center pl-5 pt-2 pb-6">
              <BackButton3D />
            </div>
          </div>
        )
        : (
          <div class="pl-5 pb-6">
            <BackButton3D />
          </div>
        ));
    default:
      return (
        <div class="pl-5 pb-6">
          <BackButton3D />
        </div>
      );
  }
}
