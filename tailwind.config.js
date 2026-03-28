/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:       '#0D0F14',
        paper:     '#F5F2EC',
        cream:     '#EDE9E0',
        line:      '#D8D3C8',
        muted:     '#9A9489',
        dim:       '#5C5850',
        signal:    '#C8411A',
        'signal-lt': '#F5E8E3',
        teal:      '#1A7A6E',
        'teal-lt': '#E3F0EE',
        gold:      '#C4871A',
        'gold-lt': '#F5EDD9',
      },
      fontFamily: {
        sans:  ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
        serif: ['var(--font-instrument)', 'Instrument Serif', 'serif'],
        mono:  ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
      },
    },
  },
  plugins: [],
}
