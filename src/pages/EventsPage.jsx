import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import api from '../services/api'

function EventsPage() {
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await api.get('/events')
        console.log('Events API response:', response.data)

        if (!Array.isArray(response.data)) {
          throw new Error('Expected /events to return an array.')
        }

        setEvents(response.data)
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setError('Unable to load events.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [])

  return (
    <main className="events-page">
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

      {!isLoading && !error && (
        <section className="events-list" aria-label="Events list">
          {events.length > 0 ? (
            events.map((event) => <EventCard key={event.id} event={event} />)
          ) : (
            <p className="status-message">No published events found.</p>
          )}
        </section>
      )}
    </main>
  )
}

export default EventsPage
