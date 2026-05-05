import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImage from '../assets/hero.png'
import api from '../services/api'
import { formatDateTime, getErrorMessage, getLoggedInUserFromToken } from '../utils/backend'

function HomePage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loggedUser = getLoggedInUserFromToken()

  useEffect(() => {
    async function loadEvents() {
      try {
        setError('')
        const response = await api.get('/events')
        setEvents(Array.isArray(response.data) ? response.data : [])
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load event overview.'))
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [])

  const eventMetrics = useMemo(() => {
    const openEvents = events.filter((event) => event.status === 'OPEN').length
    const draftEvents = events.filter((event) => event.status === 'DRAFT').length
    const recentEvents = [...events]
      .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
      .slice(0, 3)

    return {
      draftEvents,
      openEvents,
      recentEvents,
      totalEvents: events.length,
    }
  }, [events])

  return (
    <main className="page home-page">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="eyebrow">Church Events</p>
          <h1>Welcome{loggedUser?.email ? `, ${loggedUser.email}` : ''}</h1>
          <p>Start from the ministry dashboard, then open event operations when you are ready to work on setup, sales, or financials.</p>
          <div className="actions">
            <Link className="button-link" to="/events">
              View events
            </Link>
            {eventMetrics.recentEvents[0] && (
              <Link className="button-link button-secondary" to={`/events/${eventMetrics.recentEvents[0].id}`}>
                Continue latest event
              </Link>
            )}
          </div>
        </div>
        <div className="home-hero__image" aria-hidden="true">
          <img src={heroImage} alt="" />
        </div>
      </section>

      {loading && <p className="status-message">Loading overview...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="home-metrics" aria-label="Event overview">
            <article className="metric">
              <span>Total events</span>
              <strong>{eventMetrics.totalEvents}</strong>
            </article>
            <article className="metric">
              <span>Open events</span>
              <strong>{eventMetrics.openEvents}</strong>
            </article>
            <article className="metric">
              <span>Draft events</span>
              <strong>{eventMetrics.draftEvents}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <h2>Recent events</h2>
                <p className="status-message">The latest event records from the backend.</p>
              </div>
              <Link className="button-link button-secondary" to="/events">
                Manage events
              </Link>
            </div>

            {eventMetrics.recentEvents.length === 0 ? (
              <p className="status-message">No events found.</p>
            ) : (
              <div className="home-recent-list">
                {eventMetrics.recentEvents.map((event) => (
                  <Link className="home-recent-item" key={event.id} to={`/events/${event.id}`}>
                    <span className="status-pill">{event.status}</span>
                    <strong>{event.title}</strong>
                    <span>{event.location || 'No location'}</span>
                    <time dateTime={event.createdAt}>{formatDateTime(event.createdAt)}</time>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default HomePage
