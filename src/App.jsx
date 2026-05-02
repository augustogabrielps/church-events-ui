import { Navigate, Route, Routes } from 'react-router-dom'
import CreateEventPage from './pages/CreateEventPage'
import EventsPage from './pages/EventsPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />} />
      <Route path="/events/new" element={<CreateEventPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
