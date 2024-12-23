import { type Config } from "tailwindcss";
import { burstColors, burstTextColors } from "./static/colors.ts";
import typography from "@tailwindcss/typography";
import twHLJS from "tailwind-highlightjs";
import { colors } from "$fresh/src/server/deps.ts";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  safelist: [{
    pattern: /hljs+/,
  }],
  mode: "jit",
  theme: {
    extend: {
      colors: burstColors,
      textColor: burstTextColors,
    },
    hljs: {
      theme: "base16/solarized-dark",
    },
    typography: {
      DEFAULT: {
        css: {
          'h1, h2, h3, h4, h5, h6': {
            scrollMarginTop: '6rem', // Adjust for desired spacing
          },
          h1: {
            color: "#F46036", // Custom color for h1
            fontSize: "2.25rem", // Custom size
            fontWeight: "700",
          },
          h2: {
            color: burstColors.accLiteGreen,
            fontSize: "1.875rem",
            fontWeight: "600",
            fontStyle: "italic;",
            textDecoration: "underline",
            strong: {
              color: burstColors.accRed,
            },
          },
          h3: {
            color: burstTextColors.subtitles,
            fontSize: "1.5rem",
            fontWeight: "600",
            paddingLeft: "1rem", // Add padding for 2-space indent
          },
          h4: {
            color: burstColors.accLiteGreen,
            fontSize: "1.25rem",
            fontWeight: "600",
            paddingLeft: "1rem", // Add padding for 2-space indent
            strong: {
              color: burstColors.accRed,
            },
          },
          p: {
            color: burstColors.creamTan,
            lineHeight: "1.6",
            fontSize: "1rem",
            code: {
              color: burstTextColors.white,
              backgroundColor: burstColors.transGray,
              padding: "0.1em 0.4em 0.15em",
              borderRadius: "0.25rem",
              fontFamily: "monospace",
              fontSize: "0.90em",
            },
            pre: {
              backgroundColor: burstColors.termBack1,
              padding: "1rem",
              borderRadius: "0.5rem",
              color: burstTextColors.white,
              overflowX: "auto",
            },
          },
          a: {
            color: burstColors.accGreen,
            textDecoration: "underline",
            "&:visited": {
              color: burstColors.accLitePurple,
              "&:hover": {
                color: burstColors.accRed,
              },
            },
            "&:hover": {
              color: burstColors.accRed, // Change on hover
            },
            "& img": {
              borderBottom: `1px solid ${burstColors.accGreen}`, // Add underline for images in links
              textDecoration: "none",
              display: "inline-block",
              verticalAlign: "middle",
            },
            "&:visited img": {
              borderColor: burstColors.accLitePurple, // Change underline color to red on hover
            },
            "&:hover img": {
              borderColor: burstColors.accRed, // Change underline color to red on hover
            },
          },
          img: {
            display: "block",
            margin: "1.5rem auto", // Top/bottom margin, center horizontally
            padding: "0", // Reset padding if needed
            maxWidth: "100%", // Make images responsive
            height: "auto",
          },
          ol: {
            "list-style-type": "decimal", // Ensure ordered list numbering
            "padding-left": "3rem", // Increase indentation for ordered lists
            "padding-right": "3rem"
          },
          pre: {
            "@apply overflow-hidden whitespace-pre-wrap break-words p-4": {},
            paddingLeft: "3.5rem",
            paddingRight: "3.5rem",
            "code.hljs": {
              "@apply rounded-t-lg": {},
              padding: "1.75rem 2.25rem 0rem",
            },
          },
          ".code-line": {
            "@apply flex items-center": {},
            lineHeight: "1.75",
            margin: "0 !important", // Remove unintended margins
            padding: "0 !important", // Remove unintended paddings
            height: "auto", // Ensure it adapts to content
          },
          ".code-line > span": {
            "@apply inline-block": {},
            margin: "0 !important",
            padding: "0 !important",
            maxWidth: "100%", // Prevent overflowing
            overflow: "hidden", // Hide excess content
            textOverflow: "ellipsis", // Truncate if necessary
          },
          ".copy-line-button": {
            "@apply text-sm ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 cursor-pointer":
              {},
            lineHeight: "1", // Prevent button affecting line height
            marginTop: "0", // Remove vertical spacing impact
            marginBottom: "0",
          },
          "ol > li": {
            "margin-top": "0.5rem", // Add vertical spacing between list items
            "margin-bottom": "0.5rem", // Same for bottom spacing
            "&::marker": {
              color: burstTextColors.subtitles, // Customize the marker color
              fontWeight: "bold", // Optional: make markers bold
            },
            color: burstColors.creamTan2,
            code: {
              color: burstTextColors.white,
              backgroundColor: burstColors.transGray,
              padding: "0.1em 0.4em 0.15em",
              borderRadius: "0.25rem",
              fontFamily: "monospace",
            },
          },
          "ol > li > p": {
            "margin-top": "0", // Remove extra top margin from nested <p>
            "margin-bottom": "0", // Remove extra bottom margin
            "display": "inline", // Ensure <p> inside <li> doesn't break flow
            color: burstColors.creamTan2,
          },
          "img.marked-emoji-img": {
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
            margin: "1.5rem auto", // Margin around the figure
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
              fontSize: "0.90em",
            },
            figcaption: {
              marginTop: "-1rem", // Small space between image and caption
              color: burstTextColors.subtitles,
              padding: "0.2rem 0", // Slight padding for clarity
              fontSize: "0.875rem",
              textAlign: "center",
              fontStyle: "italic",
              fontWeight: "400",
            },
            "& + *": {
              marginTop: "1.5rem", // Normal gap after the figure to the next content
            },
          },
        },
      },
    },
  },
  variants: {},
  plugins: [typography, twHLJS],
} satisfies Config;
