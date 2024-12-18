import { HeadingInfo } from "./BlogRendererSS.tsx";

interface TableOfContentsProps {
    headings: HeadingInfo[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
    return (
      <nav class="p-2 text-sm bg-bgAqua text-white shadow-md lg:sticky lg:top-20 lg:max-w-xs lg:h-screen lg:bg-bgPurple">
        <ul class="space-y-1">
          {headings.map(({ id, text, level }) => (
            <li key={id} class={`pl-${level * 4}`}>
              <a
                href={`#${id}`}
                dangerouslySetInnerHTML={{ __html: text }}
                class="hover:text-accYellow transition-colors duration-200"
              />
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  
