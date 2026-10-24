import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Vote from './pages/Vote'
import Admin from './pages/Admin'
import Winners from './pages/Winners'
import BlankSlate from './pages/BlankSlate'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Vote />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/winners" element={<Winners />} />
        <Route path="/blank-slate" element={<BlankSlate />} />
        <Route path="*" element={<Vote />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
