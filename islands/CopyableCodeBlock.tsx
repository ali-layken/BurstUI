import { useEffect, useRef, useState } from "preact/hooks";

interface CopyableCodeBlockProps {
  code: string;
  lang: string;
}

export default function CopyableCodeBlock({ code, lang }: CopyableCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
    });
  };

  useEffect(() => {
    const container = containerRef.current;

    if (container) {
      const preElement = container.querySelector("pre");
      const codeElement = container.querySelector("code");

      if (preElement && codeElement) {
        // Clear any existing content inside `pre`
        preElement.innerHTML = "";
        codeElement.innerHTML = "";

        // Create top bar
        const topBar = document.createElement("div");
        topBar.className =
          "flex justify-between items-center px-6 pt-1.5 pb-0.5 bg-gray-800 text-white border-b border-gray-700";
        topBar.innerHTML = `
          <span class="text-xs text-accOrange text-opacity-60">${lang}</span>
          <div class="flex items-center gap-1 relative">
            <span id="copy-message" class="text-xs text-subtitles opacity-0 transition-opacity duration-300 absolute right-16">✅</span> 
            <button id="copy-button" class="text-blue-400 hover:text-blue-600 text-xs">copy all</button>
          </div>
        `;

        // Append top bar and code element to `pre`
        preElement.appendChild(topBar);
        


        // Attach copy event to the button
        const copyButton = topBar.querySelector("#copy-button");
        const copyMessage = topBar.querySelector("#copy-message");

        if (copyButton && copyMessage) {
          copyButton.addEventListener("click", () => {
            copyToClipboard();
            // Show "Copied!" message with fade-in effect
            copyMessage.classList.remove("opacity-0");
            copyMessage.classList.add("opacity-100");
            setTimeout(() => {
              // Fade out after 2 seconds
              copyMessage.classList.remove("opacity-100");
              copyMessage.classList.add("opacity-0");
            }, 2000);
          });
        }

        // Remove padding/margin from pre and code
        preElement.style.margin = "0";
        preElement.style.padding = "0";
        preElement.style.border = "none"; // Optional if there's a default border
        codeElement.style.margin = "0";
        codeElement.style.padding = "0";
      }
    }
  }, [lang, code]);

  return (
    <div ref={containerRef}>
      <pre>
        <code className={`hljs language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}
