import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Toast from '../components/Toast'
import api from '../services/api'
import { EVENT_STATUSES, formatDateTime, getErrorMessage } from '../utils/backend'

const emptyEventForm = {
  title: '',
  description: '',
  location: '',
  status: 'DRAFT',
}

function EventsPage() {
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(emptyEventForm)
  const [editingId, setEditingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)

  const loadEvents = useCallback(async () => {
    const response = await api.get('/events')

    if (!Array.isArray(response.data)) {
      throw new Error('Expected /events to return an array.')
    }

    setEvents(response.data)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        setError('')
        await loadEvents()
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load events.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadEvents])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function startEdit(event) {
    setEditingId(event.id)
    setForm({
      title: event.title || '',
      description: event.description || '',
      location: event.location || '',
      status: event.status || 'DRAFT',
    })
  }

  function resetForm() {
    setEditingId('')
    setForm(emptyEventForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setToast(null)

    try {
      if (editingId) {
        await api.put(`/events/${editingId}`, {
          title: form.title,
          description: form.description,
          location: form.location,
        })
        setToast({ type: 'success', message: 'Event updated.' })
      } else {
        await api.post('/events', form)
        setToast({ type: 'success', message: 'Event created.' })
      }

      resetForm()
      await loadEvents()
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to save event.') })
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(event, action) {
    setBusyId(event.id)
    setToast(null)

    try {
      await api.patch(`/events/${event.id}/${action}`)
      await loadEvents()
      setToast({ type: 'success', message: 'Event status updated.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to update status.') })
    } finally {
      setBusyId('')
    }
  }

  async function handleDelete(event) {
    if (!window.confirm(`Delete "${event.title}"?`)) {
      return
    }

    setBusyId(event.id)
    setToast(null)

    try {
      await api.delete(`/events/${event.id}`)
      await loadEvents()
      setToast({ type: 'success', message: 'Event deleted.' })
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to delete event.') })
    } finally {
      setBusyId('')
    }
  }

  return (
    <main className="page">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <section className="page-heading">
        <div>
          <p className="eyebrow">Church Events</p>
          <h1>Events</h1>
          <p>Create and manage the event records exposed by the backend.</p>
        </div>
      </section>

      <section className="panel">
        <h2>{editingId ? 'Edit event' : 'Create event'}</h2>
        <form className="grid-form" onSubmit={handleSubmit}>
          <label>
            Title
            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} required />
          </label>
          <label>
            Location
            <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} />
          </label>
          {!editingId && (
            <label>
              Status
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value)}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="grid-form__wide">
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              rows="3"
            />
          </label>
          <div className="actions grid-form__wide">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create event'}
            </button>
            {editingId && (
              <button className="button-secondary" type="button" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      {loading && <p className="status-message">Loading events...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}

      {!loading && !error && (
        <section className="events-home">
          <div className="panel__header">
            <h2>All events</h2>
          </div>
          {events.length === 0 ? (
            <p className="status-message">No events found.</p>
          ) : (
            <div className="event-card-grid">
              {events.map((event) => (
                <HomeEventCard
                  key={event.id}
                  event={event}
                  isBusy={busyId === event.id}
                  onEdit={startEdit}
                  onClose={() => handleStatus(event, 'close')}
                  onCancel={() => handleStatus(event, 'cancel')}
                  onDelete={() => handleDelete(event)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}

function HomeEventCard({ event, isBusy, onEdit, onClose, onCancel, onDelete }) {
  return (
    <article className="home-event-card">
      <div className="home-event-card__header">
        <span className="status-pill">{event.status}</span>
        <EventActionMenu
          event={event}
          isBusy={isBusy}
          onEdit={() => onEdit(event)}
          onClose={onClose}
          onCancel={onCancel}
          onDelete={onDelete}
        />
      </div>
      <div className="home-event-card__body">
        <h3>{event.title}</h3>
        {event.description && <p>{event.description}</p>}
      </div>
      <div className="home-event-card__meta">
        <span>{event.location || 'No location'}</span>
        <span>{formatDateTime(event.createdAt)}</span>
      </div>
    </article>
  )
}

function EventActionMenu({ event, isBusy, onEdit, onClose, onCancel, onDelete }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) {
      return undefined
    }

    function handleOutsideClick(mouseEvent) {
      if (!menuRef.current?.contains(mouseEvent.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  function runAction(action) {
    setOpen(false)
    action()
  }

  return (
    <div className="event-action-menu" ref={menuRef}>
      <button
        className="icon-button"
        type="button"
        aria-label={`Open actions for ${event.title}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        disabled={isBusy}
      >
        ⋮
      </button>

      {open && (
        <div className="event-action-menu__dropdown" role="menu">
          <Link role="menuitem" to={`/events/${event.id}`} onClick={() => setOpen(false)}>
            Setup
          </Link>
          <Link role="menuitem" to={`/events/${event.id}/sales`} onClick={() => setOpen(false)}>
            Sales
          </Link>
          <Link role="menuitem" to={`/events/${event.id}/financial`} onClick={() => setOpen(false)}>
            Financial
          </Link>

          <div className="event-action-menu__separator" />

          <button type="button" role="menuitem" disabled={isBusy} onClick={() => runAction(onEdit)}>
            Edit
          </button>
          <button type="button" role="menuitem" disabled={isBusy || event.status !== 'OPEN'} onClick={() => runAction(onClose)}>
            Close
          </button>
          <button type="button" role="menuitem" disabled={isBusy || event.status === 'CANCELLED'} onClick={() => runAction(onCancel)}>
            Cancel
          </button>
          <button className="danger-menu-item" type="button" role="menuitem" disabled={isBusy} onClick={() => runAction(onDelete)}>
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default EventsPage
