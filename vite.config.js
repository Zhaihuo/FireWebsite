import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || 'dev'),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
