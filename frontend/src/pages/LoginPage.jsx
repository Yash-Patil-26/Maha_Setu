import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import { setAuthSession } from '../auth/storage.js'

function rolePath(role) {
  if (role === 'officer') return '/officer'
  if (role === 'admin') return '/admin'
  return '/citizen'
}

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('rahul.patil')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      })

      setAuthSession(result.access_token, result.user)

      navigate(rolePath(result.user.role), {
        replace: true,
      })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">
          SETU · Unified Government Services
        </p>

        <h1>Sign in</h1>

        <p>
          Sign in using a seeded SETU account.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="button"
            type="submit"
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <footer className="page-footer">
          Synthetic data — SETU prototype
        </footer>
      </section>
    </main>
  )
}

export default LoginPage
