import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../components/EventCard'
import Toast from '../components/Toast'
import api from '../services/api'

function getErrorMessage(error, fallbackMessage) {
  return error.response?.data?.detail || fallbackMessage
}

function EventsPage() {
  const [events, setEvents] = useState([])
  const [rolesByEventId, setRolesByEventId] = useState({})
  const [volunteers, setVolunteers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionEventId, setActionEventId] = useState('')
  const [deleteEventId, setDeleteEventId] = useState('')
  const [roleEventId, setRoleEventId] = useState('')
  const [assigningRoleId, setAssigningRoleId] = useState('')
  const [removingAssignmentId, setRemovingAssignmentId] = useState('')
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
    return response.data
  }, [])

  const fetchEventRoles = useCallback(async (eventId) => {
    const response = await api.get(`/events/${eventId}/roles`)

    if (!Array.isArray(response.data)) {
      throw new Error('Expected event roles to return an array.')
    }

    setRolesByEventId((currentRolesByEventId) => ({
      ...currentRolesByEventId,
      [eventId]: response.data,
    }))
  }, [])

  const fetchVolunteers = useCallback(async () => {
    const response = await api.get('/volunteers')

    if (!Array.isArray(response.data)) {
      throw new Error('Expected /volunteers to return an array.')
    }

    setVolunteers(response.data)
  }, [])

  useEffect(() => {
    async function loadEvents() {
      try {
        setError('')
        const nextEvents = await fetchEvents()
        await Promise.all([
          fetchVolunteers(),
          ...nextEvents.map((event) => fetchEventRoles(event.id)),
        ])
      } catch (error) {
        console.error('Failed to fetch events:', error)
        setError('Unable to load events.')
      } finally {
        setIsLoading(false)
      }
    }

    loadEvents()
  }, [fetchEventRoles, fetchEvents, fetchVolunteers])

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
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to delete event.') })
    } finally {
      setDeleteEventId('')
    }
  }

  async function handleCreateRole(event, roleData) {
    try {
      setRoleEventId(event.id)
      setToast(null)
      await api.post(`/events/${event.id}/roles`, roleData)
      await fetchEventRoles(event.id)
      setToast({ type: 'success', message: 'Role created successfully' })
      return true
    } catch (error) {
      console.error('Failed to create role:', error)
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to create role.') })
      return false
    } finally {
      setRoleEventId('')
    }
  }

  async function handleAssignVolunteer(event, roleId, volunteerId) {
    try {
      setAssigningRoleId(roleId)
      setToast(null)
      await api.patch(`/roles/${roleId}/assign/${volunteerId}`)
      await fetchEventRoles(event.id)
      setToast({ type: 'success', message: 'Volunteer assigned successfully' })
      return true
    } catch (error) {
      console.error('Failed to assign volunteer:', error)
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to assign volunteer.') })
      return false
    } finally {
      setAssigningRoleId('')
    }
  }

  async function handleRemoveVolunteer(event, roleId, volunteerId) {
    try {
      setRemovingAssignmentId(`${roleId}:${volunteerId}`)
      setToast(null)
      await api.delete(`/roles/${roleId}/assign/${volunteerId}`)
      await fetchEventRoles(event.id)
      setToast({ type: 'success', message: 'Volunteer removed successfully' })
      return true
    } catch (error) {
      console.error('Failed to remove volunteer:', error)
      setToast({ type: 'error', message: getErrorMessage(error, 'Unable to remove volunteer.') })
      return false
    } finally {
      setRemovingAssignmentId('')
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
                isSavingRole={roleEventId === event.id}
                assigningRoleId={assigningRoleId}
                removingAssignmentId={removingAssignmentId}
                isUpdating={actionEventId === event.id}
                onDeleteEvent={handleDeleteEvent}
                onCreateRole={handleCreateRole}
                onAssignVolunteer={handleAssignVolunteer}
                onRemoveVolunteer={handleRemoveVolunteer}
                onStatusAction={handleStatusAction}
                roles={rolesByEventId[event.id] || []}
                volunteers={volunteers}
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
