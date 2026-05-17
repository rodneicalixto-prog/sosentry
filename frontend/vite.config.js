import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const buildVersion = `${pkg.version}-${Date.now()}`

export default defineConfig({
  plugins: [
    react(),
    // Substitui __BUILD_VERSION__ no sw.js copiado para dist/
    {
      name: 'sw-version',
      generateBundle(_, bundle) {
        if (bundle['sw.js']) {
          bundle['sw.js'].source = bundle['sw.js'].source
            .replace('__BUILD_VERSION__', buildVersion)
        }
      },
    },
  ],
  define: {
    __BUILD_VERSION__: JSON.stringify(buildVersion),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
