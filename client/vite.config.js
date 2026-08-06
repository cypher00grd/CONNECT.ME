import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (/node_modules\/(socket\.io-client|engine\.io-client|socket\.io-parser|engine\.io-parser)/.test(id)) {
            return 'vendor-realtime'
          }
          if (/node_modules\/(lucide-react|react-hot-toast|emoji-picker-react)/.test(id)) {
            return 'vendor-ui'
          }
          return 'vendor-core'
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
