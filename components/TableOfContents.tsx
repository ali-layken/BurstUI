import { JSX } from "preact/jsx-runtime";
import { HeadingInfo } from "./BlogRendererSS.tsx";

interface TableOfContentsProps {
  headings: HeadingInfo[];
  onLinkClick?: () => void; // Optional callback to handle link click
}

export default function TableOfContents({ headings, onLinkClick }: TableOfContentsProps): JSX.Element {
  return (
    <ul class="space-y-2 px-5">
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
            onClick={onLinkClick || undefined} // Safely call the function if provided
            dangerouslySetInnerHTML={{ __html: text }}
            class="block text-accGreen font-medium hover:text-accRed transition-colors duration-300"
            style={{
              fontSize: `${1.25 - level * 0.1}rem`, // Dynamically adjust font size
              fontWeight: `${700 - level * 100}`, // Make text weight lighter for deeper levels
            }}
          />
        </li>
      ))}
    </ul>
  );
}
