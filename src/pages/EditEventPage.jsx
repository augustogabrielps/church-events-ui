import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import api from '../services/api'

function getErrorMessage(error) {
  return error.response?.data?.detail || 'Unable to update event.'
}

function EditEventPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const initialEvent = location.state?.event
  const [eventData, setEventData] = useState(initialEvent || null)
  const [title, setTitle] = useState(initialEvent?.title || '')
  const [description, setDescription] = useState(initialEvent?.description || '')
  const [isLoading, setIsLoading] = useState(!initialEvent)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (initialEvent) {
      return
    }

    async function fetchEvent() {
      try {
        setError('')
        const response = await api.get('/events')

        if (!Array.isArray(response.data)) {
          throw new Error('Expected /events to return an array.')
        }

        const foundEvent = response.data.find((event) => event.id === id)

        if (!foundEvent) {
          setError('Event not found.')
          return
        }

        setEventData(foundEvent)
        setTitle(foundEvent.title || '')
        setDescription(foundEvent.description || '')
      } catch (error) {
        console.error('Failed to load event:', error)
        setError('Unable to load event.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvent()
  }, [id, initialEvent])

  async function handleSubmit(event) {
    event.preventDefault()
    setToast(null)
    setIsSubmitting(true)

    try {
      const response = await api.put(`/events/${id}`, {
        title,
        description,
        location: eventData?.location,
        status: eventData?.status,
      })

      console.log('Update event API response:', response.data)
      setToast({ type: 'success', message: 'Event updated successfully' })
      setTimeout(() => {
        navigate('/events')
      }, 900)
    } catch (error) {
      console.error('Failed to update event:', error)
      setToast({ type: 'error', message: getErrorMessage(error) })
    } finally {
      setIsSubmitting(false)
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
        <p className="eyebrow">Church Events</p>
        <h1>Edit event</h1>
      </section>

      {isLoading ? (
        <p className="status-message">Loading event...</p>
      ) : (
        <form className="event-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows="5"
            />
          </label>

          {error && <p className="status-message status-message--error">{error}</p>}

          <div className="event-form__actions">
            <button type="submit" disabled={isSubmitting || !eventData}>
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
            <Link className="button-link button-secondary" to="/events">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </main>
  )
}

export default EditEventPage
