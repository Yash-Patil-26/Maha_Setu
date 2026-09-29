import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth/storage'

function DashboardLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getAuthUser()
  const role = user?.role || 'citizen'

  const navigation = {
    citizen: [
      {
        label: 'Home',
        icon: '⌂',
        path: '/citizen',
      },
      {
        label: 'Consent & Data',
        icon: '◈',
        path: '/citizen/consents',
      },
    ],

    officer: [
      {
        label: 'Dashboard',
        marathi: 'डॅशबोर्ड',
        icon: '⌂',
        path: '/officer',
      },
      {
        label: 'Applications',
        marathi: 'अर्ज',
        icon: '▤',
        path: '/officer',
        anchor: 'approval-queue',
      },
    ],

    admin: [
      {
        label: 'Dashboard',
        icon: '⌂',
        path: '/admin',
      },
      {
        label: 'Connected Systems',
        icon: '▣',
        path: '/admin/systems',
      },
      {
        label: 'Onboarding Studio',
        icon: '⚙',
        path: '/admin/studio',
      },
      {
        label: 'Service Journeys',
        icon: '↔',
        path: '/admin/journeys',
      },
      {
        label: 'Access Log',
        icon: '▤',
        path: '/admin/audit',
      },
    ],
  }

  const items = navigation[role] || navigation.citizen

  const roleName = {
    citizen: 'Citizen',
    officer: 'Government Official',
    admin: 'Administrator',
  }[role] || 'User'

  function handleLogout() {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="setu-app-shell">
      <header className="setu-topbar">
        <div className="setu-brand">
          <div className="setu-brand-mark" aria-hidden="true">
            MS
          </div>

          <div className="setu-brand-copy">
            <strong>MAHA SETU</strong>
            <span>Unified Government Services</span>
          </div>
        </div>

        <div className="setu-topbar-right">
          <span className="setu-language">
            EN | मराठी
          </span>

          <div className="setu-user">
            <div className="setu-avatar" aria-hidden="true">
              {(user?.display_name || user?.username || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="setu-user-info">
              <strong>
                {user?.display_name || user?.username || 'User'}
              </strong>
              <span>{roleName}</span>
            </div>
          </div>

          <button
            className="setu-logout"
            type="button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="setu-body">
        <aside className="setu-sidebar">
          <div className="setu-sidebar-role">
            <span>Current role</span>
            <strong>{roleName}</strong>
          </div>

          <nav
            className="setu-sidebar-nav"
            aria-label="Primary navigation"
          >
            {items.map((item) => {
              const labelContent = (
                <>
                  <span
                    className="setu-nav-icon"
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>

                  <span className="setu-nav-label">
                    <strong>{item.label}</strong>
                    <small>{item.marathi}</small>
                  </span>
                </>
              )

              if (item.anchor) {
                const anchorActive =
                  (
                    location.pathname === item.path &&
                    location.hash === `#${item.anchor}`
                  ) ||
                  location.pathname.startsWith(
                    '/officer/applications/',
                  )

                return (
                  <a
                    key={`${item.label}-${item.path}-${item.anchor}`}
                    href={`${item.path}#${item.anchor}`}
                    className={`setu-nav-item${
                      anchorActive ? ' active' : ''
                    }`}
                  >
                    {labelContent}
                  </a>
                )
              }

              return (
                <NavLink
                  key={`${item.label}-${item.path}`}
                  to={item.path}
                  end={item.path === `/${role}`}
                  className={({ isActive }) =>
                    `setu-nav-item${
                      isActive ? ' active' : ''
                    }`
                  }
                >
                  {labelContent}
                </NavLink>
              )
            })}
          </nav>

          <div className="setu-sidebar-footer">
            <strong>MAHA SETU</strong>
            <small>Unified Government Services</small>
          </div>
        </aside>

        <main className="setu-main-content">
          <Outlet />
        </main>
      </div>

      <footer className="setu-shell-footer">
        <span>
          MAHA SETU · Unified Government Services
        </span>

        <span>
          Conceptual prototype — not affiliated with Government of Maharashtra.
        </span>
      </footer>
    </div>
  )
}

export default DashboardLayout
