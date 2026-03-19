import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
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
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-card': 'var(--gradient-card)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'hover': 'var(--shadow-hover)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.3s ease-out both",
        "fade-in": "fade-in 0.25s ease-out both",
        "scale-in": "scale-in 0.2s ease-out both",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": { from: { opacity: "0", transform: "scale(0.95)" }, to: { opacity: "1", transform: "scale(1)" } },
      },
      fontSize: {
        "display-lg": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        "display-md": ["2rem",    { lineHeight: "1.2", letterSpacing: "-0.01em",  fontWeight: "700" }],
        "display-sm": ["1.75rem", { lineHeight: "1.25",letterSpacing: "-0.01em",  fontWeight: "700" }],
        "headline-lg":["1.5rem",  { lineHeight: "1.3", letterSpacing: "-0.01em",  fontWeight: "600" }],
        "headline-md":["1.375rem",{ lineHeight: "1.3", letterSpacing: "-0.005em", fontWeight: "600" }],
        "headline-sm":["1.25rem", { lineHeight: "1.35",letterSpacing: "0",        fontWeight: "600" }],
        "title-lg":   ["1.125rem",{ lineHeight: "1.4", letterSpacing: "0",        fontWeight: "600" }],
        "title-md":   ["1rem",    { lineHeight: "1.5", letterSpacing: "0",        fontWeight: "500" }],
        "title-sm":   ["0.875rem",{ lineHeight: "1.5", letterSpacing: "0.005em",  fontWeight: "500" }],
        "body-lg":    ["1rem",    { lineHeight: "1.6", letterSpacing: "0",        fontWeight: "400" }],
        "body-md":    ["0.9375rem",{lineHeight: "1.55",letterSpacing: "0",        fontWeight: "400" }],
        "body-sm":    ["0.875rem",{ lineHeight: "1.5", letterSpacing: "0",        fontWeight: "400" }],
        "label-lg":   ["0.875rem",{ lineHeight: "1.4", letterSpacing: "0.025em",  fontWeight: "500" }],
        "label-md":   ["0.75rem", { lineHeight: "1.4", letterSpacing: "0.05em",   fontWeight: "600" }],
        "label-sm":   ["0.6875rem",{lineHeight:"1.4",  letterSpacing: "0.08em",   fontWeight: "600" }],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
