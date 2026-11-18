import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import App from './App'
import './styles.css'
import './spring.css'
import './animations.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Mode hors connexion : l'application elle-même est mise en cache (les données sont gardées par l'app).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
      // Vérifie s'il y a une nouvelle version à chaque retour sur l'app (PWA iPhone restée ouverte).
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void reg.update() })
    }).catch(() => { /* non pris en charge ici (iframe, navigation privée…) */ })
    // Nouvelle version installée : on recharge une fois pour l'afficher.
    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload() } })
  })
}
