/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#12161b",
        panel: "#1a2028",
        panelAlt: "#212933",
        borderc: "#2b333d",
        ink: "#e7e2d6",
        inkMuted: "#8993a1",
        haze: "#c98a4f",
        clean: "#5aa89a",
        aqi: {
          good: "#6fae66",
          satisfactory: "#9ab86a",
          moderate: "#d9a441",
          poor: "#c9793f",
          verypoor: "#c1543f",
          severe: "#8b3a3a",
        },
      },
      fontFamily: {
        display: ["IBM Plex Sans Condensed", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
