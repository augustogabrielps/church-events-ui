import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { getErrorMessage } from '../utils/backend'

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (window.localStorage.getItem('authToken')) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await loginWithRegistrationFallback(email)
      window.localStorage.setItem('authToken', response.data.token)
      navigate('/', { replace: true })
    } catch (error) {
      setError(getErrorMessage(error, 'Unable to log in.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Church Events</p>
          <h1>Email login</h1>
        </div>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        {error && <p className="status-message status-message--error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  )
}

async function loginWithRegistrationFallback(email) {
  try {
    return await api.post('/auth/login', { email })
  } catch (error) {
    if (error.response?.status !== 404) {
      throw error
    }

    await api.post('/auth/register', { email })
    return api.post('/auth/login', { email })
  }
}

export default LoginPage
