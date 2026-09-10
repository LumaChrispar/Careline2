import { createRoot } from 'react-dom/client'
import './index.css'
import './careline.css'
// @ts-expect-error The application entry is JavaScript without type declarations.
import App from './App.jsx'

createRoot(document.getElementById('root')!).render(<App />)
