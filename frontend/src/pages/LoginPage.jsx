import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AUTH_FIXTURES } from '../auth/fixtures.js'
import { getAuthUser, setAuthSession } from '../auth/storage.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const existingUser = getAuthUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (existingUser) {
    return <Navigate to={`/${existingUser.role}`} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()

    const user = Object.values(AUTH_FIXTURES).find(
      (fixture) => fixture.username === username,
    )

    if (!user || !password) {
      setError('Enter a valid fixture username and password.')
      return
    }

    setError('')
    setAuthSession(`fixture-token-${user.username}`, user)
    navigate(`/${user.role}`, { replace: true })
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="login-brand-mark">S</span>
          <div>
            <strong>SETU</strong>
            <span>Citizen Services</span>
          </div>
        </div>

        <div className="login-heading">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your SETU services.</p>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <form className="login-card" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </label>

          <button type="submit">Sign in to SETU</button>
        </form>

        <p className="login-note">
          Prototype environment — use the provided fixture credentials.
        </p>
      </section>
    </main>
  )
}
