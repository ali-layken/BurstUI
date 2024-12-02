import { type Config } from "tailwindcss";
import { burstColors, burstTextColors } from "./static/colors.ts"
import typography from "@tailwindcss/typography";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  mode: 'jit',
  theme: {
    extend: {
      colors: burstColors,
      textColor: burstTextColors
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
            color: burstColors.accGreen,
            fontSize: "1.875rem",
            fontWeight: "600",
          },
          h3: {
            color: burstColors.accGreen,
            fontSize: "1.5rem",
            fontWeight: "600",
          },
          
          p: {
            color: burstTextColors.black,
            lineHeight: "1.6",
            fontSize: "1rem"
          },
          a: {
            color: burstColors.accYellow,
            textDecoration: "underline",
            "&:hover": {
              color: burstColors.accRed, // Change on hover
            },
          },
          img: {
            display: "block",
            margin: "1.5rem auto", // Top/bottom margin, center horizontally
            padding: "0", // Reset padding if needed
            maxWidth: "100%", // Make images responsive
            height: "auto",
          },
          code: {
            color: burstTextColors.white,
            backgroundColor: burstColors.transGray,
            padding: "0.1em 0.4em",
            borderRadius: "0.25rem",
            fontFamily: "monospace",
            fontSize: "0.90em",
          },
          pre: {
            backgroundColor: burstColors.accRed,
            padding: "1rem",
            borderRadius: "0.5rem",
            color: burstTextColors.white,
            overflowX: "auto",
          },
        },
      },
    },
  },
  plugins: [typography],
  
} satisfies Config;
