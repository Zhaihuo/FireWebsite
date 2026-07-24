import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3100',
    },
  },
  preview: {
    host: '0.0.0.0',
  },
})
