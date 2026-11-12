import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource-variable/figtree/wght.css'
import '@fontsource-variable/sora/wght.css'
import '@fontsource-variable/big-shoulders-display'
import './styles.css'
import './theme-aurora.css'
import './theme-platform.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
