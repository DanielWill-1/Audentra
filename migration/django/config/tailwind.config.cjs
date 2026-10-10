module.exports = {
  content: ["./templates/**/*.html"],
  theme: {
    extend: {
      colors: {
        primary: "#004ac6",
        "brand-hover": "#1D4ED8",
        background: "#F8F9FB",
        surface: "#FFFFFF",
        "on-primary": "#ffffff",
        "on-surface": "#141b2c",
        "text-primary": "#101828",
        "text-secondary": "#475467",
        "text-muted": "#667085",
      },
      spacing: {
        margin: "1.25rem",
        "section-mobile": "4.5rem",
        "section-tablet": "5.5rem",
        "section-desktop": "8.5rem",
      },
      fontFamily: {
        body: ['"Hanken Grotesk"', "sans-serif"],
        "body-large": ['"Hanken Grotesk"', "sans-serif"],
        "body-medium": ['"Hanken Grotesk"', "sans-serif"],
        metadata: ['"Hanken Grotesk"', "sans-serif"],
        "display-hero": ['"Hanken Grotesk"', "sans-serif"],
      },
      fontSize: {
        "body-large": ["19px", { lineHeight: "28px", fontWeight: "400" }],
        "body-medium": ["16px", { lineHeight: "24px", fontWeight: "500" }],
        "display-hero": ["64px", { lineHeight: "68px", letterSpacing: "-0.03em", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};
