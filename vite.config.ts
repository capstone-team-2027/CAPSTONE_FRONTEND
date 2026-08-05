import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react-phone-input-2"]
  },
  server: {
    allowedHosts: true // Thêm dòng này vào trong mục server
  }
})
