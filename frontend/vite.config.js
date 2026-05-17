import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
const buildVersion = `${pkg.version}-${Date.now()}`

export default defineConfig({
  plugins: [
    react(),
    // Substitui __BUILD_VERSION__ no sw.js após o build (arquivo vem de public/, não é bundlado)
    {
      name: 'sw-version',
      closeBundle() {
        const swPath = './dist/sw.js'
        try {
          const src = readFileSync(swPath, 'utf-8')
          writeFileSync(swPath, src.replace('__BUILD_VERSION__', buildVersion))
        } catch { /* ignora se não existe (ex: modo dev) */ }
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
