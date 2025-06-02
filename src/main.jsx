import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './index.css'
import Chatroom from './Chat/Chatroom.jsx'
import ChatList from './Chat/ChatList.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/chats" element={<ChatList />} />
        <Route path="/chatroom" element={<Chatroom />} />
      </Routes>
    </Router>
  </StrictMode>,
)
