import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installTouchFix } from './lib/touchFix'
import { installNoZoom } from './lib/noZoom'
import { installErrorReporting } from './lib/errorLog'

installTouchFix()
installNoZoom()
installErrorReporting()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
