import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app.tsx'
// FontAwesome Icons
import '@fortawesome/fontawesome-free/css/all.min.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
) 