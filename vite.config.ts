import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }
import { edProxy } from './server/ed-proxy.mjs'

/** Branche le proxy École Directe sur `vite` et `vite preview`. */
function ecoleDirecteProxy(): Plugin {
  return {
    name: 'ecoledirecte-proxy',
    configureServer: (server) => void server.middlewares.use(edProxy('/ed')),
    configurePreviewServer: (server) => void server.middlewares.use(edProxy('/ed')),
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), ecoleDirecteProxy()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
