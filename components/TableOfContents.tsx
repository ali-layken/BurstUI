import { JSX } from "preact/jsx-runtime";
import { HeadingInfo } from "./BlogRendererSS.tsx";

interface TableOfContentsProps {
  headings: HeadingInfo[];
}

export default function TableOfContents({ headings }: TableOfContentsProps): JSX.Element {
  const isLong = headings.length > 15;
  return (
    <ul class="space-y-1 md:space-y-2 px-1 md:px-5">
      {headings.map(({ id, text, level }) => (
        <li key={id} class="relative" style={{ paddingLeft: `${level * 1.2}rem` }}>
          {/* Vertical Line for Tree */}
          <span
            class={`absolute top-0 h-full border-l border-subtitles2`}
            style={{
              left: `${(level - 1) * 1.2}rem`, // Bring the line closer to the text
            }}
          ></span>

          {/* Link */}
          <a
            href={`#${id}`}
            data-action="close"
            dangerouslySetInnerHTML={{ __html: text }}
            class={`block text-accGreen font-source4 hover:text-accRed transition-colors duration-300`}
            style={{
              fontSize: isLong ? `${1.5 - level * 0.175}rem` : `${1.63 - level * 0.16}rem`, // Dynamically adjust font size
              fontWeight: isLong ? `${800 - level * 100}` : `${800 - level * 100}`, // Make text weight lighter for deeper levels
            }}
          />
        </li>
      ))}
    </ul>
  );
}
