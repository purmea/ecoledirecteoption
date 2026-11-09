import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }
import { edProxy } from './server/ed-proxy.mjs'
import { profilesApi } from './server/profiles.mjs'

/** Branche le proxy École Directe et l'API des profils sur `vite` et `vite preview`. */
function appServer(): Plugin {
  return {
    name: 'ecoledirecte-option-server',
    configureServer: (server) => {
      server.middlewares.use(edProxy('/ed'))
      server.middlewares.use(profilesApi('/api'))
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(edProxy('/ed'))
      server.middlewares.use(profilesApi('/api'))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), appServer()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  server: { host: true, port: 5173, watch: { ignored: ['**/data/**'] } },
  preview: { host: true, port: 4173 },
})
