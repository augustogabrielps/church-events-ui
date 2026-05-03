import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../services/api'
import { formatMoney, getErrorMessage } from '../utils/backend'

function FinancialPage() {
  const { id } = useParams()
  const [eventRecord, setEventRecord] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    const eventsResponse = await api.get('/events')
    const foundEvent = eventsResponse.data.find((event) => event.id === id)

    if (!foundEvent) {
      throw new Error('Event not found.')
    }

    setEventRecord(foundEvent)

    const summaryResponse = await api.get(`/events/${id}/financial-summary`)
    setSummary(summaryResponse.data)
  }, [id])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        setError('')
        await loadData()
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load financial summary.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadData])

  return (
    <main className="page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Financial</p>
          <h1>{eventRecord?.title || 'Financial summary'}</h1>
          <p>Totals returned by the backend financial summary endpoint.</p>
        </div>
        <div className="actions">
          <Link className="button-link button-secondary" to={`/events/${id}`}>
            Setup
          </Link>
          <Link className="button-link button-secondary" to={`/events/${id}/sales`}>
            Sales
          </Link>
        </div>
      </section>

      {loading && <p className="status-message">Loading summary...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}

      {!loading && !error && summary && (
        <section className="metrics">
          <article className="metric">
            <span>Total sales amount</span>
            <strong>{formatMoney(summary.totalSalesAmount)}</strong>
          </article>
          <article className="metric">
            <span>Total confirmed payments</span>
            <strong>{formatMoney(summary.totalConfirmedPayments)}</strong>
          </article>
          <article className="metric">
            <span>Pending amount</span>
            <strong>{formatMoney(summary.pendingAmount)}</strong>
          </article>
        </section>
      )}
    </main>
  )
}

export default FinancialPage
