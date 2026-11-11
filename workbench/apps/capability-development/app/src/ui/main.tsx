import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './state'
import { Shell } from './shell'
import './styles/app.css'

const container = document.getElementById('root')
if (!container) throw new Error('The page is missing its #root element.')

createRoot(container).render(
  <StrictMode>
    <AppProvider>
      <Shell />
    </AppProvider>
  </StrictMode>,
)
