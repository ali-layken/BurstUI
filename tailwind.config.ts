import typography from "@tailwindcss/typography";
import twHLJS from "tailwind-highlightjs";
import { type Config } from "tailwindcss";
import { burstColors, burstTextColors } from "./static/colors.ts";

const deCSS = {
  'h1, h2, h3, h4, h5, h6': {
    scrollMarginTop: '6rem', // Adjust for desired spacing
    marginTop: "2rem", 
    marginBottom: "0.5rem",
    fontFamily: "Fixel"
  },
  h1: {
    color: burstTextColors.subtitles,
    fontSize: "2rem",
    fontWeight: "700",
    strong: {
      color: burstColors.accRed,
    },
  },
  h2: {
    color: burstColors.accLiteGreen,
    fontSize: "1.875rem",
    fontWeight: "600",
    fontStyle: "italic;",
    textDecoration: "underline",
    textDecorationColor: burstColors.creamTan,
    strong: {
      fontWeight: "800",
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
    fontSize: "1.2rem",
    fontFamily: "Fixel",
    fontWeight: 500,
    code: {
      color: burstTextColors.white,
      backgroundColor: burstColors.transGray,
      padding: "0.1em 0.4em 0.15em",
      borderRadius: "0.25rem",
      fontFamily: "monospace",
      fontSize: "0.85em",
    },
    pre: {
      backgroundColor: burstColors.termBack1,
      padding: "1rem",
      borderRadius: "0.5rem",
      color: burstTextColors.white,
      overflowX: "auto",
    },
    strong: {
      color: burstTextColors.transWhite,
      fontWeight: "900"
    },
    em: {
      color: burstColors.subtitles2
    },
  },
  a: {
    color: burstColors.accGreen,
    textDecoration: "underline",
    code: {
      color: burstColors.accGreen,
    },
    "&:visited": {
      color: burstColors.accLitePurple,
      code: {
        color: burstColors.accLitePurple,
      },
      "&:hover": {
        color: burstColors.accRed,
      },
    },
    "&:hover": {
      color: burstColors.accRed,
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
    padding: "0rem 3rem",
  },
  pre: {
    "@apply overflow-hidden whitespace-pre-wrap break-words p-4": {},
    paddingLeft: "1rem",
    paddingRight: "1rem",
    "code.hljs": {
      "@apply rounded-t-lg": {}, // Add the rounded-t-lg only for non-Mermaid blocks
      padding: "1.75rem 2rem 0rem",
    },
    "code.language-mermaid": {
      "@apply rounded-lg": {}, // Add the rounded-t-lg only for non-Mermaid blocks
      padding: "1.75rem 0.2rem 0rem",
      transition: "opacity 0.3s ease", 
    },
  },
  "pre.mermaid":{
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
    lineHeight: "1.6",
    fontSize: "1.2rem",
    fontFamily: "Fixel",
    fontWeight: 400,
    code: {
      color: burstTextColors.white,
      backgroundColor: burstColors.transGray,
      padding: "0.1em 0.4em 0.15em",
      borderRadius: "0.25rem",
      fontFamily: "monospace",
      fontSize: "0.85em",
    },
    strong: {
      color: burstTextColors.transWhite,
      fontWeight: "900"
    },
    em: {
      color: burstColors.subtitles2
    },
    "margin-top": "0.5rem", // Add vertical spacing between list items
    "margin-bottom": "0.5rem", // Same for bottom spacing
    "&::marker": {
      color: burstTextColors.subtitles, // Customize the marker color
      fontWeight: "bold", // Optional: make markers bold
    },
    color: burstColors.creamTan2,
    
  },
  "ol ul": {
    "list-style-type": "disc", // Explicitly enable bullets
    "margin-left": "2rem", // Ensure proper indentation
    "padding-left": "1rem", // Adjust spacing
    "li::marker": {
      color: burstTextColors.subtitles, // Customize the marker color
      fontWeight: "bold", // Optional: make markers bold
    },
  },
  "ol > li > p": {
    "margin-top": "0", // Remove extra top margin from nested <p>
    "margin-bottom": "0", // Remove extra bottom margin
    "display": "inline", // Ensure <p> inside <li> doesn't break flow
    color: burstColors.creamTan2,
    lineHeight: "1.6",
    fontSize: "1.2rem",
    fontFamily: "Fixel",
    fontWeight: 400,
    code: {
      color: burstTextColors.white,
      backgroundColor: burstColors.transGray,
      padding: "0.1em 0.4em 0.15em",
      borderRadius: "0.25rem",
      fontFamily: "monospace",
      fontSize: "0.85em",
    },
    pre: {
      backgroundColor: burstColors.termBack1,
      padding: "1rem",
      borderRadius: "0.5rem",
      color: burstTextColors.white,
      overflowX: "auto",
    },
    strong: {
      color: burstTextColors.transWhite,
      fontWeight: "900"
    },
    "&::marker": {
      color: burstTextColors.subtitles, // Customize the marker color
      fontWeight: "bold", // Optional: make markers bold
    },
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
      fontSize: "0.85em",
    },
    figcaption: {
      marginTop: "-1rem", // Small space between image and caption
      color: burstTextColors.subtitles,
      padding: "0.2rem 0", // Slight padding for clarity
      fontSize: "1rem",
      fontFamily: "Source4",
      textAlign: "center",
      fontStyle: "italic",
      fontWeight: "400",
    },
    "& + *": {
      marginTop: "1.5rem", // Normal gap after the figure to the next content
    },
  },
  hr: {
    margin: "-0.3rem 1.75rem 0.9rem -2rem"
  }
}


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
      fontFamily: {
        'teko': ['Teko'],
        'source4': ['Source4'],
        'fixel': ['Fixel']
      }
    },
    screens: {
      md: "1463px"
    },
    hljs: {
      theme: "base16/solarized-dark",
    },
    typography: {
      xl: {
        css: deCSS
      },
      lg: {
        css: {
          ...deCSS,
          h1: {
            ...deCSS.h1,
            fontSize: "1.6rem",
          },
          h2: {
            ...deCSS.h2,
            fontSize: "1.4rem",
          },
          h3: {
            ...deCSS.h3,
            fontSize: "1.2rem",
          },
          h4: {
            ...deCSS.h4,
            fontSize: "1rem",
          },
          p: {
            ...deCSS.p,
            fontSize: "1rem",
            code: {
              ...deCSS.p.code,
              fontSize: "0.85em",
            },
          },
          "ol > li": {
            ...deCSS["ol > li"],
            fontSize: "1rem",
            code: {
              ...deCSS["ol > li"].code,
              fontSize: "0.85em",
            },
          },
          "ol > li > p": {
            ...deCSS["ol > li > p"],
            fontSize: "1rem",
            code: {
              ...deCSS["ol > li > p"].code,
              fontSize: "0.85em",
            },
          },
          "figure.custom-image": {
            ...deCSS["figure.custom-image"],
            figcaption: {
              ...deCSS["figure.custom-image"].figcaption,
              fontSize: "0.9em",
            },
            code: {
              ...deCSS["figure.custom-image"].code,
              fontSize: "0.8em",
            },
          },
          hr: {
            margin: "-0.4rem 1.75rem 0.9rem -1.23rem"
          }
        }
      }
    },
  },
  variants: {},
  plugins: [typography, twHLJS],
} satisfies Config;
