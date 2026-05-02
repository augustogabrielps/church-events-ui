import { Link } from 'react-router-dom'
import { useState } from 'react'

function formatCreatedAt(createdAt) {
  if (!createdAt) {
    return 'Created date unavailable'
  }

  const date = new Date(createdAt)

  if (Number.isNaN(date.getTime())) {
    return createdAt
  }

  return date.toLocaleString()
}

function getStatusActionLabel(status) {
  if (status === 'DRAFT') {
    return 'Open Event'
  }

  if (status === 'OPEN') {
    return 'Close Event'
  }

  return ''
}

function getRoleVolunteers(role) {
  return Array.isArray(role.volunteers) ? role.volunteers : []
}

function EventCard({
  event,
  assigningRoleId = '',
  isDeleting = false,
  isSavingRole = false,
  isUpdating = false,
  removingAssignmentId = '',
  onAssignVolunteer,
  onCreateRole,
  onDeleteEvent,
  onRemoveVolunteer,
  onStatusAction,
  roles = [],
  volunteers = [],
}) {
  const actionLabel = getStatusActionLabel(event.status)
  const [roleName, setRoleName] = useState('')

  async function handleCreateRole(eventForm) {
    eventForm.preventDefault()
    const wasCreated = await onCreateRole(event, {
      name: roleName,
    })

    if (wasCreated) {
      setRoleName('')
    }
  }

  async function handleAssignVolunteer(role, volunteerId) {
    if (!volunteerId) {
      return
    }

    await onAssignVolunteer(event, role.id, volunteerId)
  }

  async function handleRemoveVolunteer(role, volunteerId) {
    if (!volunteerId) {
      return
    }

    await onRemoveVolunteer(event, role.id, volunteerId)
  }

  return (
    <article className="event-card">
      <div className="event-card__header">
        <h2>{event.title}</h2>
        <span className="event-card__status" aria-label={`Current status: ${event.status}`}>
          {event.status}
        </span>
      </div>
      <p>{event.description}</p>
      <time dateTime={event.createdAt}>{formatCreatedAt(event.createdAt)}</time>
      <div className="event-card__actions">
        <Link className="button-link button-secondary" to={`/events/${event.id}/edit`} state={{ event }}>
          Edit
        </Link>
        {actionLabel && (
          <button type="button" disabled={isUpdating} onClick={() => onStatusAction(event)}>
            {isUpdating ? 'Updating...' : actionLabel}
          </button>
        )}
        <button
          className="button-danger"
          type="button"
          disabled={isDeleting}
          onClick={() => onDeleteEvent(event)}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>

      <section className="event-card__volunteers" aria-label={`${event.title} volunteer roles`}>
        <h3>Volunteer roles</h3>
        {roles.length > 0 ? (
          <ul className="role-list">
            {roles.map((role) => (
              <RoleItem
                key={role.id}
                role={role}
                volunteers={volunteers}
                isAssigning={assigningRoleId === role.id}
                isRemoving={(roleId, volunteerId) => removingAssignmentId === `${roleId}:${volunteerId}`}
                onAssign={handleAssignVolunteer}
                onRemove={handleRemoveVolunteer}
              />
            ))}
          </ul>
        ) : (
          <p className="status-message">No roles yet.</p>
        )}

        <form className="compact-form" onSubmit={handleCreateRole}>
          <input
            type="text"
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="Role name"
            required
          />
          <button type="submit" disabled={isSavingRole}>
            {isSavingRole ? 'Adding...' : 'Add role'}
          </button>
        </form>
      </section>
    </article>
  )
}

function RoleItem({ role, volunteers, isAssigning, isRemoving, onAssign, onRemove }) {
  const assignedVolunteers = getRoleVolunteers(role)
  const assignedVolunteerIds = new Set(assignedVolunteers.map((volunteer) => volunteer.id))
  const availableVolunteers = volunteers.filter((volunteer) => !assignedVolunteerIds.has(volunteer.id))

  return (
    <li>
      <div className="role-list__details">
        <strong>{role.name}</strong>
        {assignedVolunteers.length > 0 ? (
          <ul className="assigned-volunteers" aria-label={`Assigned volunteers for ${role.name}`}>
            {assignedVolunteers.map((volunteer) => {
              const isRemovingVolunteer = isRemoving(role.id, volunteer.id)

              return (
                <li key={volunteer.id}>
                  <span>{volunteer.name}</span>
                  <button
                    className="button-secondary"
                    type="button"
                    disabled={isAssigning || isRemovingVolunteer}
                    onClick={() => onRemove(role, volunteer.id)}
                  >
                    {isRemovingVolunteer ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <span>No volunteers assigned</span>
        )}
      </div>
      <div className="role-list__actions">
        <select
          value=""
          onChange={(event) => onAssign(role, event.target.value)}
          disabled={isAssigning || availableVolunteers.length === 0}
          aria-label={`Add volunteer to ${role.name}`}
        >
          <option value="">{isAssigning ? 'Adding...' : 'Add volunteer'}</option>
          {availableVolunteers.map((volunteer) => (
            <option key={volunteer.id} value={volunteer.id}>
              {volunteer.name}
            </option>
          ))}
        </select>
      </div>
    </li>
  )
}

export default EventCard
