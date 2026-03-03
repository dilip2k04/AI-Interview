import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // '/api': { target: 'http://localhost:5000', changeOrigin: true }
      '/api': { target: 'https://ai-interviewer-v4-backend-1.onrender.com/api', changeOrigin: true }
    }, 
  }
})
