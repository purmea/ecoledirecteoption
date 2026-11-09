import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/quicksand/500.css'
import '@fontsource/quicksand/600.css'
import '@fontsource/quicksand/700.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
