import { Link } from 'react-router-dom'
import { getAuthUser } from '../auth/storage.js'
import { getRoleLabel } from '../constants/navigation.js'

function formatRole(role) {
  return getRoleLabel(role, 'en')
}

function ProfilePage() {
  const user = getAuthUser()
  const role = user?.role || 'citizen'
  const displayName =
    user?.display_name ||
    user?.username ||
    'User'

  const initial = displayName
    .trim()
    .charAt(0)
    .toUpperCase()

  const homePath =
    role === 'officer'
      ? '/officer'
      : role === 'admin'
        ? '/admin'
        : '/citizen'

  return (
    <main className="setu-dashboard-page setu-profile-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            {formatRole(role)} / My Profile
          </span>

          <h1>My Profile</h1>

          <p>
            Review the account identity currently used to access
            MAHA SETU services.
          </p>
        </div>
      </div>

      <section className="setu-profile-layout">
        <article className="setu-profile-hero-card">
          <div className="setu-profile-avatar" aria-hidden="true">
            {initial || 'U'}
          </div>

          <div className="setu-profile-hero-copy">
            <span className="setu-profile-kicker">
              MAHA SETU ACCOUNT
            </span>

            <h2>{displayName}</h2>

            <p>
              {formatRole(role)}
            </p>
          </div>
        </article>

        <section className="setu-content-card setu-profile-details">
          <div className="setu-section-heading">
            <div>
              <h2>Account details</h2>
              <p>
                Identity information associated with this session.
              </p>
            </div>
          </div>

          <div className="setu-profile-detail-grid">
            <div>
              <span>Display name</span>
              <strong>{displayName}</strong>
            </div>

            <div>
              <span>Username</span>
              <strong>{user?.username || '—'}</strong>
            </div>

            <div>
              <span>Account role</span>
              <strong>{formatRole(role)}</strong>
            </div>

            {user?.master_id && (
              <div>
                <span>SETU reference</span>
                <strong>{user.master_id}</strong>
              </div>
            )}

            <div>
              <span>Language</span>
              <strong>{user?.locale || 'en-IN'}</strong>
            </div>
          </div>
        </section>

        <section className="setu-content-card setu-profile-guidance">
          <div>
            <span className="setu-profile-kicker">
              ACCOUNT ACCESS
            </span>

            <h2>Your account stays with you</h2>

            <p>
              This account controls access to your MAHA SETU
              workspace and the services available for your role.
              Connected-service data is used only within the
              relevant service journey.
            </p>
          </div>

          <Link
            className="setu-primary-button"
            to={homePath}
          >
            Return to dashboard
          </Link>
        </section>
      </section>
    </main>
  )
}

export default ProfilePage
