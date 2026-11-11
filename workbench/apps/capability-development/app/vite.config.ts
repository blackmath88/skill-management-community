import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Plain SPA build. No server runtime: every record stays in the browser. */
export default defineConfig({
  base: './',
  server: { port: 5180 },
  preview: { port: 4173 },
  resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react()],
})
