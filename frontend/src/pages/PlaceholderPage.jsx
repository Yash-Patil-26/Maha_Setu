import { useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth/storage.js'

export default function PlaceholderPage() {
  const navigate = useNavigate()
  const user = getAuthUser()

  function handleLogout() {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <main>
      <h1>SETU</h1>
      <p>Page coming soon.</p>
      {user && <p>Signed in as {user.username}</p>}
      <button onClick={handleLogout}>Sign out</button>
    </main>
  )
}