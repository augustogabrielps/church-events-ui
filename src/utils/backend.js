export function getErrorMessage(error, fallbackMessage) {
  const data = error.response?.data

  if (typeof data === 'string') {
    return data
  }

  return data?.detail || data?.message || fallbackMessage
}

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function formatMoney(value) {
  const number = Number(value || 0)

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(Number.isNaN(number) ? 0 : number)
}

export function getLoggedInUserFromToken() {
  const token = window.localStorage.getItem('authToken')

  if (!token) {
    return null
  }

  try {
    const [, payload] = token.split('.')
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(window.atob(normalizedPayload))

    return {
      id: claims.userId,
      email: claims.sub,
      role: claims.role,
    }
  } catch {
    return null
  }
}

export const EVENT_STATUSES = ['DRAFT', 'OPEN', 'CLOSED', 'CANCELLED']
export const SELLER_TYPES = ['DIRECT', 'VOLUNTEER']
export const SALE_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED']
export const PAYMENT_METHODS = ['PIX', 'CASH', 'CARD']
export const PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'FAILED']
