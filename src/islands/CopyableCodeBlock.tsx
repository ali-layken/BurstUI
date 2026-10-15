import { useEffect, useRef } from "preact/hooks";

interface CopyableCodeBlockProps {
  code: string;
  lang: string;
}

export default function CopyableCodeBlock({ code, lang }: CopyableCodeBlockProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const codeElement = container?.parentElement?.parentElement?.querySelector("code");
    if (container && codeElement) {
      // Create the top bar
      const topBar = document.createElement("div");
      topBar.className =
        "flex justify-between items-center px-4 pt-1.5 pb-1 bg-gray-800 text-white border-t border-gray-700";
      topBar.innerHTML = `
        <span class="text-xs text-accOrange text-opacity-70">${lang}</span>
        <div class="flex items-center gap-1 relative">
          <span id="copy-message" class="text-xs text-subtitles opacity-100 hidden transition-opacity duration-500 absolute right-16">✅</span> 
          <button id="copy-all-button" class="text-blue-400 hover:text-blue-600 text-xs">copy all</button>
        </div>
      `;

      container.appendChild(topBar);

      // Add "copy all" functionality
      const copyAllButton = topBar.querySelector("#copy-all-button");
      const copyMessage = topBar.querySelector("#copy-message");

      if (copyAllButton && copyMessage) {
        copyAllButton.addEventListener("click", () => {
          navigator.clipboard.writeText(code.replaceAll("$ ", ''));
          copyMessage.classList.remove("hidden");
          copyMessage.classList.add("opacity-100");
          setTimeout(() => {
            copyMessage.classList.remove("opacity-100");
            copyMessage.classList.add("opacity-0");
          }, 1500);
        });
      }

      const clipboardButtons = codeElement.querySelectorAll(".copy-line-button");
      clipboardButtons.forEach((button) => {
        const lineCheck = document.createElement("span");
        lineCheck.className = "copy-check opacity-0 text-xs transition-opacity duration-500 absolute right-7";
        lineCheck.textContent = "✅";
        button.parentElement?.appendChild(lineCheck);

        button.addEventListener("click", () => {
          const line = decodeURIComponent(button.getAttribute("data-line") || "");
          navigator.clipboard.writeText(line.replaceAll("$ ", '')); // Copy the specific line

          // Show "Copied!" checkmark for the line
          lineCheck.classList.add("opacity-100");
          setTimeout(() => {
            lineCheck.classList.remove("opacity-100");
          }, 1200);
        });
      });
    }
  }, [lang, code]);

  return <div ref={containerRef}></div>;
}
