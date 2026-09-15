import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  define: {
    global: 'window',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Market Data, Catalysts, Valuation & AI — Python FastAPI (port 8000)
      '/api/assets': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/market': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/market': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/analytics/portfolios': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/analytics': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/tax': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/optimizer': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/dividends': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/filings': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/macro': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/integrations': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/v1/integrations': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Core Domain — Java Spring Boot (port 8080) — catches everything else under /api
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // WebSocket — Java Spring Boot STOMP
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-tanstack': ['@tanstack/react-query'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
})