import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Listen on the LAN too, so a phone on the same Wi-Fi can open the dev server.
  server: { host: true },
})
