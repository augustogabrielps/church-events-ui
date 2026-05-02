import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

function getErrorMessage(error) {
  return error.response?.data?.detail || 'Unable to create event.'
}

function CreateEventPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await api.post('/events', {
        title,
        description,
      })

      console.log('Create event API response:', response.data)
      navigate('/')
    } catch (error) {
      console.error('Failed to create event:', error)
      setError(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="events-page">
      <section className="events-page__intro">
        <p className="eyebrow">Church Events</p>
        <h1>Create event</h1>
      </section>

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
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create event'}
          </button>
          <Link className="button-link button-secondary" to="/">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  )
}

export default CreateEventPage
