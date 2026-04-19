import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3000'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://dysnlzaqnwpmmbqundqd.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5c25semFxbndwbW1icXVuZHFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzODAwMjQsImV4cCI6MjA5MTk1NjAyNH0.DKBAeXj_zHIXq8Kf9r0Gfk8-lLnUtZT0_7FZH0sOIgw'),
    'import.meta.env.VITE_CRM_SUPABASE_URL': JSON.stringify(process.env.VITE_CRM_SUPABASE_URL || 'https://uvvmooztkolmkckmwjwz.supabase.co'),
    'import.meta.env.VITE_CRM_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_CRM_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dm1vb3p0a29sbWtja213and6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTQzNjMsImV4cCI6MjA3OTczMDM2M30.05Nc1VMmu79K1x0ruQJNubRXVtnekdWMq0vqd3-QmaM')
  }
})
