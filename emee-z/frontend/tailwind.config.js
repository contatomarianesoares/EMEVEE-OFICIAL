/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── tokens legados EMEVEE-Z (mantidos para compatibilidade) ──
        'juri-deep':   '#F8F9FB',
        'juri-mid':    '#FFFFFF',
        'juri-card':   '#FFFFFF',
        'juri-border': '#F0F0F0',
        'juri-teal':   '#22C55E',
        'juri-hover':  '#16A34A',
        'juri-amber':  '#F59E0B',
        'juri-text':   '#111827',
        'juri-muted':  '#6B7280',
        'juri-faint':  '#9CA3AF',
        // ── tokens compartilhados com JURIALVO-CRM ──
        page:       '#F8F9FB',
        card:       '#FFFFFF',
        sidebar:    '#1D2144',
        'sb-hover': '#272C5A',
        'sb-active':'#363D7A',
        green:      '#22C55E',
        'green-h':  '#16A34A',
        danger:     '#EF4444',
        warn:       '#F59E0B',
        info:       '#3B82F6',
        'tx-1':     '#111827',
        'tx-2':     '#6B7280',
        'tx-3':     '#9CA3AF',
        border:     '#F0F0F0',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:       '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover':'0 4px 16px rgba(0,0,0,0.10), 0 12px 32px rgba(0,0,0,0.08)',
        topbar:     '0 1px 0 #F0F0F0, 0 2px 8px rgba(0,0,0,0.03)',
        modal:      '0 24px 64px rgba(0,0,0,0.16)',
      },
    },
  },
  plugins: [],
}
