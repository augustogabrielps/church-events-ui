import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import api from '../services/api'
import { formatMoney, getErrorMessage, getLoggedInUserFromToken } from '../utils/backend'

const emptyRole = { name: '', description: '', requiredPeople: 1 }
const emptyVolunteer = { name: '', email: '' }
const emptyTicketType = { name: '', description: '', price: '', availableQuantity: '' }

function EventDetailPage() {
  const { id } = useParams()
  const [eventRecord, setEventRecord] = useState(null)
  const [roles, setRoles] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [ticketTypes, setTicketTypes] = useState([])
  const [roleForm, setRoleForm] = useState(emptyRole)
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteer)
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketType)
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState(null)
  const loggedInUser = getLoggedInUserFromToken()
  const userRole = loggedInUser?.role
  const canManageVolunteers = userRole === 'ADMIN' || userRole === 'LEADER'

  const loadData = useCallback(async () => {
    const [eventsResponse, rolesResponse, volunteersResponse, ticketTypesResponse] = await Promise.all([
      api.get('/events'),
      api.get(`/events/${id}/roles`),
      api.get('/volunteers'),
      api.get(`/events/${id}/ticket-types`),
    ])

    const foundEvent = eventsResponse.data.find((event) => event.id === id)

    if (!foundEvent) {
      throw new Error('Event not found.')
    }

    setEventRecord(foundEvent)
    setRoles(Array.isArray(rolesResponse.data) ? rolesResponse.data : [])
    setVolunteers(Array.isArray(volunteersResponse.data) ? volunteersResponse.data : [])
    setTicketTypes(Array.isArray(ticketTypesResponse.data) ? ticketTypesResponse.data : [])
  }, [id])

  useEffect(() => {
    async function load() {
      try {
        setError('')
        await loadData()
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load event setup.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadData])

  const volunteersById = useMemo(() => new Map(volunteers.map((volunteer) => [volunteer.id, volunteer])), [volunteers])

  function updateRole(field, value) {
    setRoleForm((current) => ({ ...current, [field]: value }))
  }

  function updateVolunteer(field, value) {
    setVolunteerForm((current) => ({ ...current, [field]: value }))
  }

  function updateTicketType(field, value) {
    setTicketTypeForm((current) => ({ ...current, [field]: value }))
  }

  async function saveWithToast(key, action, successMessage, fallbackMessage) {
    setBusyKey(key)
    setToast(null)

    try {
      await action()
      await loadData()
      setToast({ type: 'success', message: successMessage })
      return true
    } catch (error) {
      setToast({ type: 'error', message: getErrorMessage(error, fallbackMessage) })
      return false
    } finally {
      setBusyKey('')
    }
  }

  async function handleCreateRole(event) {
    event.preventDefault()
    const created = await saveWithToast(
      'role',
      () => api.post(`/events/${id}/roles`, { ...roleForm, requiredPeople: Number(roleForm.requiredPeople) }),
      'Role created.',
      'Unable to create role.',
    )

    if (created) {
      setRoleForm(emptyRole)
    }
  }

  async function handleCreateVolunteer(event) {
    event.preventDefault()
    const created = await saveWithToast(
      'volunteer',
      () => api.post('/volunteers', volunteerForm),
      'Volunteer created.',
      'Unable to create volunteer.',
    )

    if (created) {
      setVolunteerForm(emptyVolunteer)
    }
  }

  async function handleCreateTicketType(event) {
    event.preventDefault()
    const created = await saveWithToast(
      'ticket-type',
      () =>
        api.post(`/events/${id}/ticket-types`, {
          name: ticketTypeForm.name,
          description: ticketTypeForm.description,
          price: Number(ticketTypeForm.price),
          availableQuantity: Number(ticketTypeForm.availableQuantity),
        }),
      'Ticket type created.',
      'Unable to create ticket type.',
    )

    if (created) {
      setTicketTypeForm(emptyTicketType)
    }
  }

  async function handleAssign(roleId, volunteerId) {
    if (!volunteerId) {
      return
    }

    await saveWithToast(
      `assign:${roleId}`,
      () => api.patch(`/roles/${roleId}/assign/${volunteerId}`),
      'Volunteer assigned.',
      'Unable to assign volunteer.',
    )
  }

  async function handleUnassign(roleId, volunteerId) {
    await saveWithToast(
      `unassign:${roleId}:${volunteerId}`,
      () => api.delete(`/roles/${roleId}/assign/${volunteerId}`),
      'Volunteer unassigned.',
      'Unable to unassign volunteer.',
    )
  }

  async function handleJoin(roleId) {
    await saveWithToast(
      `join:${roleId}`,
      () => api.patch(`/roles/${roleId}/join`),
      'Joined role.',
      'Unable to join role.',
    )
  }

  async function handleLeave(roleId) {
    await saveWithToast(
      `leave:${roleId}`,
      () => api.delete(`/roles/${roleId}/leave`),
      'Left role.',
      'Unable to leave role.',
    )
  }

  return (
    <main className="page">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">Event setup</p>
          <h1>{eventRecord?.title || 'Event'}</h1>
          <p>Roles, volunteers, and ticket types for this event.</p>
        </div>
        <div className="actions">
          <Link className="button-link button-secondary" to="/">
            Events
          </Link>
          <Link className="button-link button-secondary" to={`/events/${id}/sales`}>
            Sales
          </Link>
          <Link className="button-link button-secondary" to={`/events/${id}/financial`}>
            Financial
          </Link>
        </div>
      </section>

      {loading && <p className="status-message">Loading setup...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="panel">
            <h2>Ticket types</h2>
            {canManageVolunteers && (
              <form className="grid-form" onSubmit={handleCreateTicketType}>
                <label>
                  Name
                  <input value={ticketTypeForm.name} onChange={(event) => updateTicketType('name', event.target.value)} required />
                </label>
                <label>
                  Price
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ticketTypeForm.price}
                    onChange={(event) => updateTicketType('price', event.target.value)}
                    required
                  />
                </label>
                <label>
                  Available quantity
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ticketTypeForm.availableQuantity}
                    onChange={(event) => updateTicketType('availableQuantity', event.target.value)}
                    required
                  />
                </label>
                <label className="grid-form__wide">
                  Description
                  <textarea
                    value={ticketTypeForm.description}
                    onChange={(event) => updateTicketType('description', event.target.value)}
                    rows="2"
                  />
                </label>
                <div className="actions grid-form__wide">
                  <button type="submit" disabled={busyKey === 'ticket-type'}>
                    {busyKey === 'ticket-type' ? 'Creating...' : 'Create ticket type'}
                  </button>
                </div>
              </form>
            )}

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Available</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketTypes.map((ticketType) => (
                    <tr key={ticketType.id}>
                      <td>
                        <strong>{ticketType.name}</strong>
                        <span>{ticketType.description}</span>
                      </td>
                      <td>{formatMoney(ticketType.price)}</td>
                      <td>{ticketType.availableQuantity}</td>
                      <td>{ticketType.remainingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {canManageVolunteers && (
            <section className="panel">
              <h2>Volunteers</h2>
              <form className="inline-form" onSubmit={handleCreateVolunteer}>
                <label>
                  Name
                  <input value={volunteerForm.name} onChange={(event) => updateVolunteer('name', event.target.value)} required />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    value={volunteerForm.email}
                    onChange={(event) => updateVolunteer('email', event.target.value)}
                    required
                  />
                </label>
                <button type="submit" disabled={busyKey === 'volunteer'}>
                  {busyKey === 'volunteer' ? 'Creating...' : 'Create volunteer'}
                </button>
              </form>
            </section>
          )}

          <section className="panel">
            <h2>Roles</h2>
            {canManageVolunteers && (
              <form className="grid-form" onSubmit={handleCreateRole}>
                <label>
                  Name
                  <input value={roleForm.name} onChange={(event) => updateRole('name', event.target.value)} required />
                </label>
                <label>
                  Required people
                  <input
                    type="number"
                    min="1"
                    value={roleForm.requiredPeople}
                    onChange={(event) => updateRole('requiredPeople', event.target.value)}
                    required
                  />
                </label>
                <label className="grid-form__wide">
                  Description
                  <textarea value={roleForm.description} onChange={(event) => updateRole('description', event.target.value)} rows="2" />
                </label>
                <div className="actions grid-form__wide">
                  <button type="submit" disabled={busyKey === 'role'}>
                    {busyKey === 'role' ? 'Creating...' : 'Create role'}
                  </button>
                </div>
              </form>
            )}

            <div className="stack">
              {roles.length === 0 && <p className="status-message">No roles found.</p>}
              {roles.map((role) => {
                const assignedIds = new Set((role.volunteers || []).map((volunteer) => volunteer.id))
                const availableVolunteers = volunteers.filter((volunteer) => !assignedIds.has(volunteer.id))
                const currentUserIsAssigned = (role.volunteers || []).some((volunteer) => volunteer.email === loggedInUser?.email)

                return (
                  <article className="subpanel" key={role.id}>
                    <div className="panel__header">
                      <div>
                        <h3>{role.name}</h3>
                        <p>{role.description || 'No description'}</p>
                      </div>
                      <strong>{(role.volunteers || []).length} / {role.requiredPeople}</strong>
                    </div>
                    <div className="chips">
                      {(role.volunteers || []).map((volunteer) => (
                        <span className="chip" key={volunteer.id}>
                          {volunteer.name || volunteersById.get(volunteer.id)?.name}
                          {canManageVolunteers && (
                            <button
                              type="button"
                              disabled={busyKey === `unassign:${role.id}:${volunteer.id}`}
                              onClick={() => handleUnassign(role.id, volunteer.id)}
                            >
                              Remove
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                    {canManageVolunteers ? (
                      <select
                        value=""
                        disabled={busyKey === `assign:${role.id}` || availableVolunteers.length === 0}
                        onChange={(event) => handleAssign(role.id, event.target.value)}
                      >
                        <option value="">Assign volunteer</option>
                        {availableVolunteers.map((volunteer) => (
                          <option key={volunteer.id} value={volunteer.id}>
                            {volunteer.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="actions">
                        {currentUserIsAssigned ? (
                          <button type="button" disabled={busyKey === `leave:${role.id}`} onClick={() => handleLeave(role.id)}>
                            {busyKey === `leave:${role.id}` ? 'Leaving...' : 'Leave role'}
                          </button>
                        ) : (
                          <button type="button" disabled={busyKey === `join:${role.id}`} onClick={() => handleJoin(role.id)}>
                            {busyKey === `join:${role.id}` ? 'Joining...' : 'Join role'}
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export default EventDetailPage
