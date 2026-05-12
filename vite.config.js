import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Chemins relatifs pour file:///android_asset/
  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // ─────────────────────────────────────────────────────────
        // IIFE = script classique, SANS type="module"
        //
        // Vite génère par défaut <script type="module"> qui est
        // silencieusement bloqué avec file:// dans WebView Android
        // (restriction CORS sur l'origine null).
        // IIFE produit un <script src="..."> normal qui fonctionne.
        // ─────────────────────────────────────────────────────────
        format: 'iife',
        inlineDynamicImports: true,   // un seul fichier JS, pas de chunks
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
})
