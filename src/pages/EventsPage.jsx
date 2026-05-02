import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import Toast from '../components/Toast'
import api from '../services/api'

function getErrorMessage(error) {
  return error.response?.data?.detail || 'Unable to delete event.'
}

function EventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionEventId, setActionEventId] = useState('')
  const [deleteEventId, setDeleteEventId] = useState('')
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState(null)

  const fetchEvents = useCallback(async () => {
    const response = await api.get('/events')
    console.log('Events API response:', response.data)

    if (!Array.isArray(response.data)) {
      throw new Error('Expected /events to return an array.')
    }

    setEvents(response.data)
  }, [])

  useEffect(() => {
    async function loadEvents() {
      try {
        setError('')
        await fetchEvents()
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setError('Unable to load events.')
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [fetchEvents])

  async function handleStatusAction(event) {
    const actionByStatus = {
      DRAFT: 'open',
      OPEN: 'close',
    }
    const action = actionByStatus[event.status]

    if (!action) {
      return
    }

    try {
      setActionEventId(event.id)
      setActionError('')
      await api.patch(`/events/${event.id}/${action}`)
      await fetchEvents()
    } catch (error) {
      console.error('Failed to update event status:', error)
      setActionError('Unable to update event status.')
    } finally {
      setActionEventId('')
    }
  }

  async function handleDeleteEvent(event) {
    const shouldDelete = window.confirm(`Delete "${event.title}"?`)

    if (!shouldDelete) {
      return
    }

    try {
      setDeleteEventId(event.id)
      setToast(null)
      await api.delete(`/events/${event.id}`)
      await fetchEvents()
      setToast({ type: 'success', message: 'Event deleted successfully' })
    } catch (error) {
      console.error('Failed to delete event:', error)
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setDeleteEventId('')
    }
  }

  return (
    <main className="events-page">
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <section className="events-page__intro">
        <div>
          <p className="eyebrow">Church Events</p>
          <h1>Upcoming events</h1>
          <p>Stay connected with the latest gatherings and activities.</p>
        </div>
        <Link className="button-link" to="/events/new">
          Create event
        </Link>
      </section>

      {isLoading && <p className="status-message">Loading events...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}
      {actionError && <p className="status-message status-message--error">{actionError}</p>}

      {!isLoading && !error && (
        <section className="events-list" aria-label="Events list">
          {events.length > 0 ? (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isDeleting={deleteEventId === event.id}
                isUpdating={actionEventId === event.id}
                onDeleteEvent={handleDeleteEvent}
                onStatusAction={handleStatusAction}
              />
            ))
          ) : (
            <p className="status-message">No published events found.</p>
          )}
        </section>
      )}
    </main>
  )
}

export default EventsPage
