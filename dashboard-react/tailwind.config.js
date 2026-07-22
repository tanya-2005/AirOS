/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        bg: "#FBFAF8",
        surface: "#FFFFFF",
        search: "#F4F1EC",

        // Ink / text ramp
        ink: "#141618",
        muted: {
          1: "#6B6F75",
          2: "#7B8087",
          3: "#8A8F96",
          4: "#9AA0A6",
          5: "#B5B2AB",
        },

        // Borders
        border: {
          DEFAULT: "#E9E7E2",
          hover: "#DBD8D2",
          nav: "#ECEAE4",
          divider: "#F1EFEA",
        },

        // Primary accent (teal)
        accent: {
          DEFAULT: "#1F7A85",
          hover: "#125A63",
          tint: "#EAF3F3",
        },
        selection: "#D6EBEC",

        // Dark panel (hero / prediction cards)
        panel: {
          DEFAULT: "#141618",
          nested: "#1C2023",
          muted: "#8A959A",
          muted2: "#6E7679",
          accent: "#7FD0D6",
        },

        // Status
        success: { DEFAULT: "#2E7D52", soft: "#4CAF7D", bg: "#E8F1EA" },
        warning: { DEFAULT: "#9A7217", soft: "#E0A83B", bg: "#FBF3E1" },
        danger: { DEFAULT: "#B7502C", soft: "#D4663B", bg: "#FBEDE8" },
        hazard: { DEFAULT: "#9A2F41", soft: "#B23B4E", bg: "#F6E6E8" },
        neutralchip: { bg1: "#F0EEE9", text1: "#6E7679", text1alt: "#44474B", bg2: "#EDF0EF", text2: "#5E7B80" },

        // AQI category ramp (CPCB bands, restyled to new palette)
        aqi: {
          good: "#2E7D52",
          satisfactory: "#4CAF7D",
          moderate: "#9A7217",
          poor: "#B7502C",
          verypoor: "#D4663B",
          severe: "#9A2F41",
        },
      },
      fontFamily: {
        // Noto Sans Devanagari/Tamil/Bengali fall in before the generic
        // "serif" keyword — Newsreader has no glyphs for those scripts, so
        // translated headings/labels (Multilingual Citizen Communication)
        // get the matched Noto family instead of an arbitrary OS default.
        display: ["Newsreader", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Bengali", "serif"],
        body: [
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "-apple-system",
          "BlinkMacSystemFont",
          "Noto Sans Devanagari",
          "Noto Sans Tamil",
          "Noto Sans Bengali",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "monospace"],
      },
      maxWidth: {
        content: "1320px",
      },
      borderRadius: {
        card: "20px",
        cardsm: "18px",
        control: "11px",
        chip: "9px",
      },
      boxShadow: {
        lift: "0 14px 40px -22px rgba(20,22,24,.24)",
        panel: "0 18px 44px -28px rgba(20,22,24,.5)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        livedot: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.35 },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeUp: "fadeUp .6s both",
        livedot: "livedot 2.2s ease-in-out infinite",
        livedotFast: "livedot 1.6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
      },
      transitionTimingFunction: {
        lift: "cubic-bezier(.22,.61,.36,1)",
      },
    },
  },
  plugins: [],
};
