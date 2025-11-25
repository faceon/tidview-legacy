/** @type {import('tailwindcss').Config} */
module.exports = {
  content: {
    // include common source extensions (jsx/tsx) so Tailwind finds classes
    files: ["./src/**/*.{html,js,jsx,ts,tsx}"],
    // Safelist classes that are generated dynamically at runtime or built from JS
    safelist: [
      "text-tid-positive",
      "text-tid-negative",
      "text-tid-neutral",
      "text-tid-muted",
      "text-tid-text",
      "bg-tid-bg-danger",
      "bg-tid-bg-subtle",
    ],
  },
  theme: {
    extend: {
      spacing: {
        xxs: "2px",
        xs: "4px",
        compact: "6px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      borderRadius: {
        sm: "8px",
        md: "10px",
        pill: "999px",
      },
      colors: {
        "tid-text": "#111111",
        "tid-muted": "#666666",
        "tid-subtle": "#444444",
        "tid-positive": "#107c41",
        "tid-negative": "#b00020",
        "tid-neutral": "#444444",
        "tid-bg-surface": "#ffffff",
        "tid-bg-subtle": "#fafafa",
        "tid-bg-muted": "#f3f3f3",
        "tid-bg-danger": "#ffe6e6",
      },
    },
  },
  plugins: [],
};
