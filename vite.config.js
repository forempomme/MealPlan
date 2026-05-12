import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Chemins relatifs → fonctionne depuis file:///android_asset/
  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Inline tous les imports dynamiques dans un seul bundle.
        // Indispensable pour WebView + file:// : les dynamic imports ES module
        // échouent silencieusement avec une origine file:// (pas de CORS).
        inlineDynamicImports: true,
      },
    },
  },
})
