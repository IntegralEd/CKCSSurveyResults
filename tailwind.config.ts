import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — from Softr_Chart_Style_Reference
        brand: {
          navy:   '#17345B',  // Strongly Agree / primary text / headings
          blue:   '#255694',  // Agree
          lime:   '#BCD631',  // Neutral
          orange: '#F79520',  // Negative
          slate:  '#5E738C',  // secondary text, n= labels, muted UI
        },
      },
    },
  },
  plugins: [],
};

export default config;
