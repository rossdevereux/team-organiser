import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kit: {
          primary: 'var(--kit-primary)',
          secondary: 'var(--kit-secondary)',
          'primary-contrast': 'var(--kit-primary-contrast)',
          'secondary-contrast': 'var(--kit-secondary-contrast)',
        },
        surface: {
          base: 'var(--surface-base)',
          card: 'var(--surface-card)',
          'card-hover': 'var(--surface-card-hover)',
          'card-subtle': 'var(--surface-card-subtle)',
          border: 'var(--surface-border)',
          'border-subtle': 'var(--surface-border-subtle)',
        },
        text: {
          main: 'var(--text-main)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
        },
        position: {
          gk: 'var(--pos-gk)',
          'gk-bg': 'var(--pos-gk-bg)',
          'gk-border': 'var(--pos-gk-border)',
          'gk-text': 'var(--pos-gk-text)',
          def: 'var(--pos-def)',
          'def-bg': 'var(--pos-def-bg)',
          'def-border': 'var(--pos-def-border)',
          'def-text': 'var(--pos-def-text)',
          mid: 'var(--pos-mid)',
          'mid-bg': 'var(--pos-mid-bg)',
          'mid-border': 'var(--pos-mid-border)',
          'mid-text': 'var(--pos-mid-text)',
          att: 'var(--pos-att)',
          'att-bg': 'var(--pos-att-bg)',
          'att-border': 'var(--pos-att-border)',
          'att-text': 'var(--pos-att-text)',
        },
        pitch: {
          turf1: 'var(--pitch-turf-1)',
          turf2: 'var(--pitch-turf-2)',
          turf3: 'var(--pitch-turf-3)',
          border: 'var(--pitch-border)',
        },
        compliance: {
          met: 'var(--compliance-met)',
          warning: 'var(--compliance-warning)',
          danger: 'var(--compliance-danger)',
        },
      },
      spacing: {
        'touch-min': 'var(--touch-target-min)',
        'density-pad': 'var(--density-padding)',
        'density-gap': 'var(--density-gap)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        dugout: 'var(--shadow-dugout)',
        tactical: 'var(--glow-tactical)',
      },
      borderRadius: {
        touch: 'var(--radius-lg)',
      },
    },
  },
  plugins: [],
};

export default config;
