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

function EventCard({ event }) {
  return (
    <article className="event-card">
      <div className="event-card__header">
        <h2>{event.title}</h2>
        <span className="event-card__status">{event.status}</span>
      </div>
      <p>{event.description}</p>
      <time dateTime={event.createdAt}>{formatCreatedAt(event.createdAt)}</time>
    </article>
  )
}

export default EventCard
