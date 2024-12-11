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
      theme: 'base16/solarized-dark',
    },
    typography: {
      DEFAULT: {
        css: {
          h1: {
            color: "#F46036", // Custom color for h1
            fontSize: "2.25rem", // Custom size
            fontWeight: "700",
          },
          h2: {
            color: burstColors.accRed2,
            fontSize: "1.875rem",
            fontWeight: "600",
            fontStyle: "italic;",
            textDecoration: "underline"
          },
          h3: {
            color: burstColors.accGreen2,
            fontSize: "1.5rem",
            fontWeight: "600",
            paddingLeft: "1rem", // Add padding for 2-space indent
          },
          h4: {
            color: burstColors.accRed2,
            fontSize: "1.25rem",
            fontWeight: "600",
            paddingLeft: "1rem", // Add padding for 2-space indent
            strong: {
              color: burstColors.accRed
            }
          },
          p: {
            color: burstColors.creamTan,
            lineHeight: "1.6",
            fontSize: "1rem",
            code: {
              color: burstTextColors.white,
              backgroundColor: burstColors.transGray,
              padding: "0.1em 0.4em",
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
                color: burstColors.accRed
              }
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
          },
          pre: {
            paddingLeft: "2rem",
            paddingRight: "2rem"
          },
          "ol > li": {
            "margin-top": "0.5rem", // Add vertical spacing between list items
            "margin-bottom": "0.5rem", // Same for bottom spacing
            "&::marker": {
              color: burstTextColors.subtitles, // Customize the marker color
              fontWeight: "bold", // Optional: make markers bold
            },
            color: burstColors.creamTan2
          },
          "ol > li > p": {
            "margin-top": "0", // Remove extra top margin from nested <p>
            "margin-bottom": "0", // Remove extra bottom margin
            "display": "inline", // Ensure <p> inside <li> doesn't break flow
            color: burstColors.creamTan2
          },
          "img.marked-emoji-img": {
            display: "inline-block",
            width: "1em",
            height: "1em",
            verticalAlign: "-0.15em",
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
