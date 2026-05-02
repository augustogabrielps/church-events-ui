import { Navigate, Route, Routes } from 'react-router-dom'
import CreateEventPage from './pages/CreateEventPage'
import EditEventPage from './pages/EditEventPage'
import EventsPage from './pages/EventsPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<EventsPage />} />
      <Route path="/events/new" element={<CreateEventPage />} />
      <Route path="/events/:id/edit" element={<EditEventPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
