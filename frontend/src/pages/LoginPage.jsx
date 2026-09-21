import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AUTH_FIXTURES } from '../auth/fixtures.js'
import { getAuthUser, setAuthSession } from '../auth/storage.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const existingUser = getAuthUser()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (existingUser) {
    return <Navigate to={`/${existingUser.role}`} replace />
  }

  function handleSubmit(event) {
    event.preventDefault()

    const user = Object.values(AUTH_FIXTURES).find(
      (fixture) => fixture.username === username,
    )

    if (!user || !password) {
      return
    }

    setAuthSession(`fixture-token-${user.username}`, user)
    navigate(`/${user.role}`, { replace: true })
  }

  return (
    <main>
      <h1>SETU</h1>
      <p>Sign in to continue.</p>

      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <button type="submit">Sign in</button>
      </form>
    </main>
  )
}