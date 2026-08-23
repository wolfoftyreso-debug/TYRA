import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: "#0b0c0e"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

