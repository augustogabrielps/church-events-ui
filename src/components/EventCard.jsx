import { Link } from 'react-router-dom'

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

function EventCard({
  event,
  isDeleting = false,
  isUpdating = false,
  onDeleteEvent,
  onStatusAction,
}) {
  const actionLabel = getStatusActionLabel(event.status)

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
    </article>
  )
}

export default EventCard
