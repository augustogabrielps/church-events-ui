import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import api from '../services/api'
import {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SALE_STATUSES,
  SELLER_TYPES,
  formatDateTime,
  formatMoney,
  getErrorMessage,
  getLoggedInUserFromToken,
} from '../utils/backend'

const emptySale = {
  ticketTypeId: '',
  sellerType: 'DIRECT',
  buyerName: '',
  quantity: 1,
  status: 'PENDING',
}

const emptyPayment = {
  amount: '',
  method: 'PIX',
  status: 'PENDING',
}

function isUnauthorized(error) {
  return error.response?.status === 401
}

function getAuthErrorMessage(error, fallbackMessage) {
  if (isUnauthorized(error)) {
    return 'Unauthorized. Log in again on this same host and port, then retry the action.'
  }

  return getErrorMessage(error, fallbackMessage)
}

function SalesPage() {
  const { id } = useParams()
  const [eventRecord, setEventRecord] = useState(null)
  const [ticketTypes, setTicketTypes] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [users, setUsers] = useState([])
  const [sales, setSales] = useState([])
  const [paymentsBySaleId, setPaymentsBySaleId] = useState({})
  const [saleForm, setSaleForm] = useState(emptySale)
  const [paymentForms, setPaymentForms] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState('')
  const [error, setError] = useState('')
  const [salesError, setSalesError] = useState('')
  const [toast, setToast] = useState(null)

  const loggedInUser = getLoggedInUserFromToken()

  const loadPublicData = useCallback(async () => {
    const [eventsResponse, ticketTypesResponse, volunteersResponse] = await Promise.all([
      api.get('/events'),
      api.get(`/events/${id}/ticket-types`),
      api.get('/volunteers'),
    ])

    const foundEvent = eventsResponse.data.find((event) => event.id === id)

    if (!foundEvent) {
      throw new Error('Event not found.')
    }

    setEventRecord(foundEvent)
    setTicketTypes(Array.isArray(ticketTypesResponse.data) ? ticketTypesResponse.data : [])
    setVolunteers(Array.isArray(volunteersResponse.data) ? volunteersResponse.data : [])
  }, [id])

  const loadProtectedData = useCallback(async () => {
    setSalesError('')

    try {
      const usersResponse = await api.get('/users')
      setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : [])
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error
      }

      setUsers([])
    }

    let nextSales

    try {
      const salesResponse = await api.get(`/events/${id}/ticket-sales`)
      nextSales = Array.isArray(salesResponse.data) ? salesResponse.data : []
      setSales(nextSales)
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error
      }

      setSales([])
      setPaymentsBySaleId({})
      setSalesError('You are not authorized to view existing sales for this event.')
      return
    }

    const paymentPairs = await Promise.all(
      nextSales.map(async (sale) => {
        try {
          const response = await api.get(`/ticket-sales/${sale.id}/payments`)
          return [sale.id, Array.isArray(response.data) ? response.data : []]
        } catch (error) {
          if (!isUnauthorized(error)) {
            throw error
          }

          return [sale.id, []]
        }
      }),
    )

    setPaymentsBySaleId(Object.fromEntries(paymentPairs))
  }, [id])

  const loadData = useCallback(async () => {
    await loadPublicData()
    await loadProtectedData()
  }, [loadProtectedData, loadPublicData])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        setError('')
        await loadData()
      } catch (error) {
        setError(getErrorMessage(error, 'Unable to load sales.'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [loadData])

  const volunteersById = useMemo(() => new Map(volunteers.map((volunteer) => [volunteer.id, volunteer])), [volunteers])
  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])

  function updateSale(field, value) {
    setSaleForm((current) => ({ ...current, [field]: value }))
  }

  function updatePayment(saleId, field, value) {
    setPaymentForms((current) => ({
      ...current,
      [saleId]: {
        ...emptyPayment,
        ...current[saleId],
        [field]: value,
      },
    }))
  }

  async function perform(key, action, successMessage, fallbackMessage) {
    setBusyKey(key)
    setToast(null)

    try {
      await action()
      await loadProtectedData()
      setToast({ type: 'success', message: successMessage })
      return true
    } catch (error) {
      setToast({ type: 'error', message: getAuthErrorMessage(error, fallbackMessage) })
      return false
    } finally {
      setBusyKey('')
    }
  }

  async function handleCreateSale(event) {
    event.preventDefault()
    const created = await perform(
      'sale',
      () =>
        api.post('/ticket-sales', {
          eventId: id,
          ticketTypeId: saleForm.ticketTypeId,
          sellerType: saleForm.sellerType,
          buyerName: saleForm.buyerName,
          quantity: Number(saleForm.quantity),
          status: saleForm.status,
        }),
      'Sale created.',
      'Unable to create sale.',
    )

    if (created) {
      setSaleForm(emptySale)
    }
  }

  async function handleCancelSale(saleId) {
    await perform(
      `cancel:${saleId}`,
      () => api.patch(`/ticket-sales/${saleId}/cancel`),
      'Sale cancelled.',
      'Unable to cancel sale.',
    )
  }

  async function handleCreatePayment(event, sale) {
    event.preventDefault()
    const form = { ...emptyPayment, ...paymentForms[sale.id] }
    const created = await perform(
      `payment:${sale.id}`,
      () =>
        api.post(`/ticket-sales/${sale.id}/payments`, {
          amount: Number(form.amount),
          method: form.method,
          status: form.status,
          paidAt: null,
        }),
      'Payment created.',
      'Unable to create payment.',
    )

    if (created) {
      setPaymentForms((current) => ({ ...current, [sale.id]: emptyPayment }))
    }
  }

  async function handleUpdatePaymentStatus(saleId, paymentId, status) {
    await perform(
      `payment-status:${paymentId}`,
      () => api.patch(`/ticket-sales/${saleId}/payments/${paymentId}/status`, { status }),
      'Payment status updated.',
      'Unable to update payment status.',
    )
  }

  return (
    <main className="page">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <section className="page-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h1>{eventRecord?.title || 'Event sales'}</h1>
          <p>Ticket sales, payments, and cancellation for this event.</p>
        </div>
        <div className="actions">
          <Link className="button-link button-secondary" to={`/events/${id}`}>
            Setup
          </Link>
          <Link className="button-link button-secondary" to={`/events/${id}/financial`}>
            Financial
          </Link>
        </div>
      </section>

      {loading && <p className="status-message">Loading sales...</p>}
      {error && <p className="status-message status-message--error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="panel">
            <h2>Create sale</h2>
            <form className="grid-form" onSubmit={handleCreateSale}>
              <label>
                Ticket type
                <select value={saleForm.ticketTypeId} onChange={(event) => updateSale('ticketTypeId', event.target.value)} required>
                  <option value="">Select ticket type</option>
                  {ticketTypes.map((ticketType) => (
                    <option key={ticketType.id} value={ticketType.id}>
                      {ticketType.name} ({ticketType.remainingQuantity} remaining)
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Seller
                <input value={loggedInUser?.email || 'Sign in to create a sale'} disabled readOnly />
              </label>
              <label>
                Seller type
                <select value={saleForm.sellerType} onChange={(event) => updateSale('sellerType', event.target.value)}>
                  {SELLER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Buyer name
                <input value={saleForm.buyerName} onChange={(event) => updateSale('buyerName', event.target.value)} required />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  min="1"
                  value={saleForm.quantity}
                  onChange={(event) => updateSale('quantity', event.target.value)}
                  required
                />
              </label>
              <label>
                Status
                <select value={saleForm.status} onChange={(event) => updateSale('status', event.target.value)}>
                  {SALE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions grid-form__wide">
                <button type="submit" disabled={busyKey === 'sale'}>
                  {busyKey === 'sale' ? 'Creating...' : 'Create sale'}
                </button>
              </div>
            </form>
          </section>

          <section className="panel">
            <h2>Sales management</h2>
            <p className="status-message">
              Assigned ticket numbers are created and linked internally by the backend, but no current response DTO exposes them.
            </p>
            {salesError && <p className="status-message status-message--error">{salesError}</p>}
            {sales.length === 0 ? (
              <p className="status-message">No sales found.</p>
            ) : (
              <div className="stack">
                {sales.map((sale) => {
                  const paymentForm = { ...emptyPayment, ...paymentForms[sale.id] }
                  const payments = paymentsBySaleId[sale.id] || []

                  return (
                    <article className="subpanel" key={sale.id}>
                      <div className="panel__header">
                        <div>
                          <h3>{sale.buyerName}</h3>
                          <p>
                            {sale.quantity} x {sale.ticketTypeName} via {sale.sellerType}
                          </p>
                          {sale.volunteerId && <p>Volunteer: {volunteersById.get(sale.volunteerId)?.name || sale.volunteerId}</p>}
                        </div>
                        <div className="summary-values">
                          <strong>{formatMoney(sale.totalAmount)}</strong>
                          <span>Remaining {formatMoney(sale.remainingAmount)}</span>
                          <span>{sale.status}</span>
                        </div>
                      </div>
                      <p className="status-message">
                        Seller: {usersById.get(sale.sellerId)?.name || sale.sellerId} | Created {formatDateTime(sale.createdAt)}
                      </p>
                      <div className="actions">
                        {sale.status !== 'CANCELLED' && (
                          <button
                            className="button-danger"
                            type="button"
                            disabled={busyKey === `cancel:${sale.id}`}
                            onClick={() => handleCancelSale(sale.id)}
                          >
                            {busyKey === `cancel:${sale.id}` ? 'Cancelling...' : 'Cancel sale'}
                          </button>
                        )}
                      </div>

                      <h4>Payments</h4>
                      <form className="inline-form" onSubmit={(event) => handleCreatePayment(event, sale)}>
                        <label>
                          Amount
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={paymentForm.amount}
                            onChange={(event) => updatePayment(sale.id, 'amount', event.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Method
                          <select value={paymentForm.method} onChange={(event) => updatePayment(sale.id, 'method', event.target.value)}>
                            {PAYMENT_METHODS.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Status
                          <select value={paymentForm.status} onChange={(event) => updatePayment(sale.id, 'status', event.target.value)}>
                            {PAYMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button type="submit" disabled={busyKey === `payment:${sale.id}`}>
                          {busyKey === `payment:${sale.id}` ? 'Adding...' : 'Add payment'}
                        </button>
                      </form>

                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Amount</th>
                              <th>Method</th>
                              <th>Status</th>
                              <th>Paid at</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payments.map((payment) => (
                              <tr key={payment.id}>
                                <td>{formatMoney(payment.amount)}</td>
                                <td>{payment.method}</td>
                                <td>{payment.status}</td>
                                <td>{formatDateTime(payment.paidAt)}</td>
                                <td>
                                  <div className="row-actions">
                                    {PAYMENT_STATUSES.map((status) => (
                                      <button
                                        className="button-secondary"
                                        type="button"
                                        key={status}
                                        disabled={payment.status !== 'PENDING' || busyKey === `payment-status:${payment.id}`}
                                        onClick={() => handleUpdatePaymentStatus(sale.id, payment.id, status)}
                                      >
                                        {status}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default SalesPage
