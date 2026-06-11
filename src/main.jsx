import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Overview from './pages/Overview.jsx'
import Room from './pages/Room.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/room/:slug" element={<Room />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
