import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',   // chemins relatifs → fonctionne depuis file:///android_asset/
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Tout en un seul chunk pour simplifier l'embedding dans l'APK
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
})
