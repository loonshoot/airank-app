module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['ui-monospace', 'monospace'],
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      animation: {
        'spin': 'spin 4s linear infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'pulse-glow-reverse': 'pulse-glow-reverse 5s ease-in-out infinite',
        'pulse-glow-slow': 'pulse-glow-slow 6s ease-in-out infinite',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '0.6',
            transform: 'scale(1) translate(0, 0)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.2) translate(10%, -10%)',
          },
        },
        'pulse-glow-reverse': {
          '0%, 100%': {
            opacity: '0.7',
            transform: 'scale(1) translate(0, 0)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.15) translate(-6%, 6%)',
          },
        },
        'pulse-glow-slow': {
          '0%, 100%': {
            opacity: '0.5',
            transform: 'scale(1) translate(0, 0)',
          },
          '50%': {
            opacity: '0.9',
            transform: 'scale(1.3) translate(-10%, 10%)',
          },
        },
      },
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
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
          "7": "hsl(var(--chart-7))",
        },
        // Legacy colors for backward compatibility
      'pink': {
        600: '#FE0170',
      },
        'green': {
          600: '#16a34a', // Match airank-website green
        },
      'yellow': {
        400: '#FFC403',
      },
      'blue': {
        500: "#450EFF",
        600: "#00FFFF"
      },
      'red': {
        500: '#ff0e0e',
        600: '#ff0e0e',
      },
      'purple': {
        500: '#1c1436',
        600: '#bc13fe'
      },
        'gray': {
          300: '#D0D0D0',
          400: '#CBD6D3',
        },
      'grey': {
        200: '#7A8488',
      },
        'light': "#F3FAF0",
        'dark': "#101624"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
