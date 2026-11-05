import typography from "@tailwindcss/typography";
import twHLJS from "tailwind-highlightjs";
import { type Config } from "tailwindcss";
import { MD_PX } from "./src/lib/breakpoint";
import { burstColors, burstTextColors } from "./src/lib/colors";

// Blog post typography (the `prose-lg` / `prose-xl` classes on the article in src/pages/blog/[postname].astro).
// Both sizes share one rule set; only the measurements below differ.
const inlineCode = {
  color: burstTextColors.white,
  backgroundColor: burstColors.transGray,
  padding: "0.1em 0.4em 0.15em",
  borderRadius: "0.25rem",
  fontFamily: "monospace",
  fontSize: "0.85em",
};
const preBlock = {
  backgroundColor: burstColors.termBack1,
  padding: "1rem",
  borderRadius: "0.5rem",
  color: burstTextColors.white,
  overflowX: "auto",
};
const strongText = { color: burstTextColors.transWhite, fontWeight: "900" };
const emText = { color: burstColors.subtitles2 };
const listMarker = { "&::marker": { color: burstTextColors.subtitles, fontWeight: "bold" } };

interface ProseSizes {
  h1: string;
  h2: string;
  h3: string;
  h4: string;
  body: string;
  caption: string;
  captionCode: string;
  hr: string;
}

const prose = (s: ProseSizes) => {
  const bodyText = { lineHeight: "1.6", fontSize: s.body, fontFamily: "Fixel" };
  return {
    "h1, h2, h3, h4, h5, h6": {
      scrollMarginTop: "6rem",
      marginTop: "2rem",
      marginBottom: "0.5rem",
      fontFamily: "Fixel",
    },
    h1: {
      color: burstTextColors.subtitles,
      fontSize: s.h1,
      marginBottom: "-1rem",
      fontWeight: "700",
      strong: { color: burstColors.accRed },
    },
    h2: {
      color: burstColors.accLiteGreen,
      fontSize: s.h2,
      fontWeight: "600",
      fontStyle: "italic",
      textDecoration: "underline",
      textDecorationColor: burstColors.creamTan,
      strong: { fontWeight: "800", color: burstColors.accRed },
    },
    h3: {
      color: burstTextColors.subtitles,
      fontSize: s.h3,
      fontWeight: "600",
      paddingLeft: "1rem",
    },
    h4: {
      color: burstColors.accLiteGreen,
      fontSize: s.h4,
      fontWeight: "600",
      paddingLeft: "1rem",
      strong: { color: burstColors.accRed },
    },
    p: {
      color: burstColors.creamTan,
      ...bodyText,
      fontWeight: 500,
      code: inlineCode,
      pre: preBlock,
      strong: strongText,
      em: emText,
    },
    a: {
      color: burstColors.accGreen,
      textDecoration: "underline",
      code: { color: burstColors.accGreen },
      "&:visited": {
        color: burstColors.accLitePurple,
        code: { color: burstColors.accLitePurple },
        "&:hover": { color: burstColors.accRed },
      },
      "&:hover": { color: burstColors.accRed },
      // Linked images get an underline too.
      "& img": {
        borderBottom: `1px solid ${burstColors.accGreen}`,
        textDecoration: "none",
        display: "inline-block",
        verticalAlign: "middle",
      },
      "&:visited img": { borderColor: burstColors.accLitePurple },
      "&:hover img": { borderColor: burstColors.accRed },
    },
    img: {
      display: "block",
      margin: "1.5rem auto",
      padding: "0",
      maxWidth: "100%",
      height: "auto",
    },
    ol: {
      listStyleType: "decimal",
      padding: "0rem 3rem",
    },
    // Code blocks: BlogRendererSS.tsx wraps every line in .code-line with a hover-only copy button.
    pre: {
      "@apply overflow-hidden whitespace-pre-wrap break-words p-4": {},
      paddingLeft: "1rem",
      paddingRight: "1rem",
      "code.hljs": {
        "@apply rounded-t-lg": {},
        padding: "1.75rem 2rem 0rem",
      },
      "code.language-mermaid": {
        "@apply rounded-lg": {},
        padding: "1.75rem 0.2rem 0rem",
        transition: "opacity 0.3s ease",
      },
    },
    "pre.mermaid": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "auto",
      whiteSpace: "normal",
      minHeight: "100px",
    },
    "pre:has(.mermaid)": {
      "@apply overflow-hidden p-0 my-4": {},
    },
    ".code-line": {
      "@apply flex items-center": {},
      lineHeight: "1.75",
      margin: "0 !important",
      padding: "0 !important",
      height: "auto",
    },
    ".code-line > span": {
      "@apply inline-block": {},
      margin: "0 !important",
      padding: "0 !important",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    ".copy-line-button": {
      "@apply text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer": {},
      lineHeight: "1",
      marginTop: "0",
      marginBottom: "0",
    },
    "ol > li": {
      ...bodyText,
      fontWeight: 400,
      code: inlineCode,
      strong: strongText,
      em: emText,
      marginTop: "0.5rem",
      marginBottom: "0.5rem",
      ...listMarker,
      color: burstColors.creamTan2,
    },
    "ol ul": {
      listStyleType: "disc",
      marginLeft: "2rem",
      paddingLeft: "1rem",
      "li::marker": { color: burstTextColors.subtitles, fontWeight: "bold" },
    },
    // A <p> inside a list item flows inline with the marker.
    "ol > li > p": {
      marginTop: "0",
      marginBottom: "0",
      display: "inline",
      color: burstColors.creamTan2,
      ...bodyText,
      fontWeight: 400,
      code: inlineCode,
      pre: preBlock,
      strong: strongText,
      ...listMarker,
    },
    ".marked-emoji-img": {
      display: "inline-block",
      width: "1.1em",
      height: "1.1em",
      verticalAlign: "-0.2em",
      position: "relative",
      margin: "0",
      padding: "0",
    },
    "figure.custom-image": {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      margin: "1.5rem auto",
      img: {
        borderRadius: "0.5rem",
        maxWidth: "100%",
        height: "auto",
      },
      code: {
        color: burstTextColors.transWhite,
        backgroundColor: burstColors.trans2Gray,
        padding: "0.1em 0.4em",
        borderRadius: "0.25rem",
        fontFamily: "monospace",
        fontSize: s.captionCode,
      },
      figcaption: {
        marginTop: "-1rem",
        color: burstTextColors.subtitles,
        padding: "0.2rem 0",
        fontSize: s.caption,
        fontFamily: "Source4",
        textAlign: "center",
        fontStyle: "italic",
        fontWeight: "400",
      },
      "& + *": { marginTop: "1.5rem" },
    },
    hr: { margin: s.hr },
  };
};

export default {
  content: ["./src/**/*.{astro,ts,tsx,js,jsx,md}"],
  // highlight.js classes are generated by the tailwind-highlightjs plugin, not found in content.
  safelist: [{ pattern: /hljs+/ }],
  theme: {
    extend: {
      colors: burstColors,
      textColor: burstTextColors,
      fontFamily: {
        source4: ["Source4"],
        fixel: ["Fixel"],
      },
    },
    // The single layout breakpoint (src/lib/breakpoint.ts): sidebar column vs bottom drawer.
    screens: { md: `${MD_PX}px` },
    hljs: { theme: "base16/solarized-dark" },
    typography: {
      xl: {
        css: prose({
          h1: "2rem", h2: "1.875rem", h3: "1.5rem", h4: "1.25rem",
          body: "1.2rem", caption: "1rem", captionCode: "0.85em",
          hr: "-0.3rem 1.75rem 0.9rem -2rem",
        }),
      },
      lg: {
        css: prose({
          h1: "1.6rem", h2: "1.4rem", h3: "1.2rem", h4: "1rem",
          body: "1rem", caption: "0.9em", captionCode: "0.8em",
          hr: "-0.4rem 1.75rem 0.9rem -1.23rem",
        }),
      },
    },
  },
  plugins: [typography, twHLJS],
} satisfies Config;
