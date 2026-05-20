import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../../')
  const env = loadEnv(mode, envDir, '')
  const apiBase = !env.VITE_API_BASE_URL || env.VITE_API_BASE_URL.startsWith('/')
    ? `http://localhost:${env.PORT ?? 3000}`
    : env.VITE_API_BASE_URL

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiBase,
          changeOrigin: true,
        },
      },
    },
  }
})
