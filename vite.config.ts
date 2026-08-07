import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react-phone-input-2"]
  },
  server: {
    host: true, // bind cả IPv4 (0.0.0.0) lẫn IPv6, để 127.0.0.1:5173 truy cập được
    allowedHosts: true // Thêm dòng này vào trong mục server
  }
})
