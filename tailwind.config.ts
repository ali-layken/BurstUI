import { type Config } from "tailwindcss";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx,js,jsx}",
  ],
  mode: 'jit',
  theme: {
    extend: {
      colors: {
        bgPurple: "#2D0666",
        accOrange: "#F46036",
        accYellow: "#EDF67D",
        bgAqua: "#17947F",
        accRed: "#E71D36",
        accGreen: "#A1E887",
      },
    },
  },
  
} satisfies Config;
