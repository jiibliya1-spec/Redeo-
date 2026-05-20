/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "road-dash": {
          "0%": { transform: "translateX(100vw) scaleX(1)", opacity: "0" },
          "10%": { opacity: "1" },
          "90%": { opacity: "1" },
          "100%": { transform: "translateX(-100vw) scaleX(1)", opacity: "0" },
        },
        "road-glow": {
          "0%,100%": { opacity: "0.3", boxShadow: "0 0 6px rgba(255,107,0,0.2)" },
          "50%": { opacity: "1", boxShadow: "0 0 20px rgba(255,107,0,0.6), 0 0 40px rgba(255,107,0,0.3)" },
        },
        "particle-float": {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "0" },
          "20%": { opacity: "0.6" },
          "80%": { opacity: "0.3" },
          "100%": { transform: "translateY(-100vh) translateX(30px)", opacity: "0" },
        },
        "glow-pulse": {
          "0%,100%": { opacity: "0.4", filter: "blur(40px)" },
          "50%": { opacity: "0.8", filter: "blur(60px)" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        "headlight-sweep": {
          "0%": { opacity: "0", transform: "translateX(-20px) scaleX(0.3)" },
          "50%": { opacity: "0.6" },
          "100%": { opacity: "0", transform: "translateX(60px) scaleX(1)" },
        },
        "neon-flicker": {
          "0%,100%": { opacity: "1", textShadow: "0 0 10px rgba(255,107,0,0.5), 0 0 20px rgba(255,107,0,0.3), 0 0 40px rgba(255,107,0,0.1)" },
          "50%": { opacity: "0.95", textShadow: "0 0 20px rgba(255,107,0,0.8), 0 0 40px rgba(255,107,0,0.5), 0 0 60px rgba(255,107,0,0.2)" },
        },
        "car-bob": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "wheel-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "road-dash": "road-dash 2s linear infinite",
        "road-glow": "road-glow 2s ease-in-out infinite",
        "particle-float": "particle-float 4s ease-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "progress-fill": "progress-fill 3.5s ease-out forwards",
        "headlight-sweep": "headlight-sweep 2s ease-in-out infinite",
        "neon-flicker": "neon-flicker 2s ease-in-out infinite",
        "car-bob": "car-bob 2s ease-in-out infinite",
        "wheel-spin": "wheel-spin 0.5s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}