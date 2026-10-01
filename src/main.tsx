import { CommunityProvider } from './community/CommunityContext'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommunityProvider><App /></CommunityProvider>
  </StrictMode>,
)
