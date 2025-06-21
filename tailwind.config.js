module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    fontFamily: {
      mono: ['var(--font-mono)'],
    },
    container: {
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
    extend: {
      animation: {
        'spin': 'spin 4s linear infinite',
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
    colors: {
      'pink': {
        600: '#FE0170',
      },
      'green': {
        600: '#51F72B',
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
      'grey': {
        200: '#7A8488',
      },
      'light': "#F3FAF0",
      'dark': "#101624"
    },
  },
  plugins: [],
};
