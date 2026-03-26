import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
const isDocker = process.env.DOCKER === 'true' || process.env.DOCKER === '1'
const backendUrl = isDocker
  ? 'http://backend:8000'
  : 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
    },
    ...(isDocker
      ? {
          proxy: {
            '/api': {
              target: backendUrl,
              changeOrigin: true,
            },
          },
        }
      : {}),
  },
})
