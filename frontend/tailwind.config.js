/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark ground/panel studio theme. One accent (terracotta, selection +
        // Drawing Method construction ink), one reserved Transfer Grid ink
        // (blue, kept distinct so grid and construction never read as one
        // drawing), one warning ink (amber). See CONTEXT.md / issue #39.
        studio: {
          950: '#1c1d20', // ground
          900: '#232529', // panel
          850: '#28292e',
          800: '#313339',
          750: '#3a3c43',
          700: '#4a4d55',
          600: '#63666f',
          500: '#82858e',
          400: '#a3a6ad',
          300: '#c4c6cb',
          200: '#dcdde0',
          100: '#eeeef0',
          50: '#f7f7f8',
          accent: '#c8623f',
          gold: '#d2a24c',
          grid: '#7fb3d5',
        }
      },
      fontFamily: {
        sans: ['var(--font-instrument-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        // Project-wide floor: no body text smaller than 13px.
        xs: '0.8125rem',
      },
    },
  },
  plugins: [],
};
