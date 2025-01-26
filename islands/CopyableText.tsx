import { useState } from "preact/hooks";
import { JSX } from "preact/jsx-runtime";

interface CopyableTextProps {
  text: string;
}

export default function CopyableText({ text }: CopyableTextProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // Reset to clipboard icon after 1.5 seconds
    }).catch((err) => {
      console.error("Failed to copy text: ", err);
    });
  };

  return (
    <>
    <span
      onClick={handleCopyToClipboard}
      class="cursor-pointer font-source4 items-center gap-2 text-accGreen hover:text-accRed hover:underline transition-colors duration-200"                
      title="Click to copy"
    >
      <span class="mr-1">{text}</span>
    </span>
    <span class="mr-1">{copied ? ("✅") : ("📋")}</span>
    </>
  );
}
