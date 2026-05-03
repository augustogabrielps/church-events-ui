import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import EventDetailPage from './pages/EventDetailPage'
import EventsPage from './pages/EventsPage'
import FinancialPage from './pages/FinancialPage'
import LoginPage from './pages/LoginPage'
import SalesPage from './pages/SalesPage'
import api from './services/api'
import { formatDateTime, getErrorMessage, getLoggedInUserFromToken } from './utils/backend'
import './App.css'

function ProtectedPage({ children }) {
  const navigate = useNavigate()
  const token = window.localStorage.getItem('authToken')
  const loggedUser = getLoggedInUserFromToken()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  function handleLogout() {
    window.localStorage.removeItem('authToken')
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="app-header">
        <NotificationBell />
        <span>{loggedUser?.email || 'Authenticated user'}</span>
        <button className="button-secondary" type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>
      {children}
    </>
  )
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bellRef = useRef(null)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    async function loadNotifications() {
      setLoading(true)
      setError('')

      try {
        const response = await api.get('/notifications')
        setNotifications(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load notifications.'))
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleOutsideClick(event) {
      if (!bellRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <div className="notification-bell" ref={bellRef}>
      <button
        className="notification-bell__button"
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && <span className="notification-bell__count">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-bell__dropdown">
          <div className="notification-bell__header">
            <strong>Notifications</strong>
            {loading && <span>Loading...</span>}
          </div>
          {error && <p className="status-message status-message--error">{error}</p>}
          {!loading && !error && notifications.length === 0 && <p className="status-message">No notifications.</p>}
          {!error && notifications.length > 0 && (
            <ul className="notification-list">
              {notifications.map((notification) => (
                <li className={notification.read ? '' : 'notification-list__item--unread'} key={notification.id}>
                  <p>{notification.message}</p>
                  <span>{formatDateTime(notification.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedPage><EventsPage /></ProtectedPage>} />
      <Route path="/events/:id" element={<ProtectedPage><EventDetailPage /></ProtectedPage>} />
      <Route path="/events/:id/sales" element={<ProtectedPage><SalesPage /></ProtectedPage>} />
      <Route path="/events/:id/financial" element={<ProtectedPage><FinancialPage /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
