import { JSX } from "preact/jsx-runtime";
import { HeadingInfo } from "./BlogRendererSS.tsx";

interface TableOfContentsProps {
  headings: HeadingInfo[];
}

interface TocSection {
  h1: HeadingInfo;
  children: HeadingInfo[];
}

function buildSections(headings: HeadingInfo[]): TocSection[] {
  const sections: TocSection[] = [];
  let current: TocSection | null = null;

  for (const h of headings) {
    if (h.level === 1) {
      current = { h1: h, children: [] };
      sections.push(current);
    } else if (current) {
      current.children.push(h);
    }
  }

  return sections;
}

export default function TableOfContents(
  { headings }: TableOfContentsProps,
): JSX.Element {
  const sections = buildSections(headings);
  const isLong = headings.length > 15;

  return (
    <ul class="space-y-1 md:space-y-2 px-1 md:px-5">
      {/* 🔝 Top link (restored) */}
      <li class="relative">
        <a
          href="#PostTitle"
          class="block text-accGreen font-source4 hover:text-accRed transition-colors duration-300 text-sm italic"
        >
          Top
        </a>
      </li>

      {sections.map(({ h1, children }) => (
        <li key={h1.id} class="relative">
          <details class="group">
            {/* H1 row */}
            <summary class="flex items-center gap-2 cursor-pointer select-none font-source4 text-accGreen hover:text-accRed">
              {/* Arrow */}
              <span class="inline-block transition-transform duration-200 ease-out group-open:rotate-90">
                &gt;
              </span>

              <a
                href={`#${h1.id}`}
                dangerouslySetInnerHTML={{ __html: h1.text }}
                class="font-bold text-lg"
              />
            </summary>

            {/* Children */}
            <ul class="mt-2 space-y-1">
              {children.map(({ id, text, level }) => {
                const padding = level * 1.2;

                return (
                  <li
                    key={id}
                    class="relative"
                    style={{ paddingLeft: `${padding}rem` }}
                  >
                    {/* Tree spine (restored) */}
                    <span
                      class="absolute top-0 h-full border-l border-subtitles2"
                      style={{
                        left: `${(level - 1) * 1.2}rem`,
                      }}
                    />

                    <a
                      href={`#${id}`}
                      dangerouslySetInnerHTML={{ __html: text }}
                      class="block text-accGreen font-source4 hover:text-accRed transition-colors duration-300"
                      style={{
                        fontSize: isLong
                          ? `${1.35 - level * 0.14}rem`
                          : `${1.63 - level * 0.16}rem`,
                        fontWeight: `${800 - level * 100}`,
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  );
}
