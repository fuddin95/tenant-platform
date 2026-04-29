import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: { 1: 'var(--bg-1)', 2: 'var(--bg-2)', 3: 'var(--bg-3)' },
        fg: { 1: 'var(--fg-1)', 2: 'var(--fg-2)', 3: 'var(--fg-3)' },
        sage: {
          DEFAULT: 'var(--color-sage)',
          dark: 'var(--color-sage-dark)',
          light: 'var(--color-sage-light)',
        },
        warn: { DEFAULT: 'var(--color-warn)', bg: 'var(--color-warn-bg)' },
        danger: { DEFAULT: 'var(--color-danger)', bg: 'var(--color-danger-bg)' },
        border: { 1: 'var(--border-1)', 2: 'var(--border-2)' },
        surface: { 1: 'var(--surface-1)', 2: 'var(--surface-2)' },
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        full: 'var(--radius-full)',
      },
    },
  },
  plugins: [],
};

export default config;
