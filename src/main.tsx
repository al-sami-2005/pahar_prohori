// Self-hosted fonts: the demo must not depend on a font CDN at the judging table.
import '@fontsource-variable/geist'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource-variable/noto-sans-bengali'
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
