import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth/storage'

function DashboardLayout() {
  const navigate = useNavigate()
  const user = getAuthUser()
  const role = user?.role || 'citizen'

  const navigation = {
    citizen: [
      {
        label: 'Dashboard',
        marathi: 'डॅशबोर्ड',
        icon: 'home',
        path: '/citizen',
      },
      {
        label: 'Apply for Schemes',
        marathi: 'योजनांसाठी अर्ज',
        icon: 'services',
        path: '/citizen/apply',
      },
      {
        label: 'My Applications',
        marathi: 'माझे अर्ज',
        icon: 'applications',
        path: '/citizen/applications',
      },
      {
        label: 'Consent & Data',
        marathi: 'संमती व डेटा',
        icon: 'consent',
        path: '/citizen/consents',
      },
      {
        label: 'Help & Support',
        marathi: 'मदत व सहाय्य',
        icon: 'help',
        path: '/citizen/help',
      },
    ],
    officer: [
      {
        label: 'Dashboard',
        marathi: 'डॅशबोर्ड',
        icon: 'home',
        path: '/officer',
      },
      {
        label: 'Approval Queue',
        marathi: 'मंजुरी रांग',
        icon: 'applications',
        path: '/officer/applications',
      },
      {
        label: 'My Decisions',
        marathi: 'माझे निर्णय',
        icon: 'decisions',
        path: '/officer/decisions',
      },
    ],
    admin: [
      {
        label: 'Dashboard',
        icon: 'home',
        path: '/admin',
      },
      {
        label: 'Manage Systems',
        icon: 'systems',
        path: '/admin/systems',
      },
      {
        label: 'Onboarding Studio',
        icon: 'studio',
        path: '/admin/studio',
      },
      {
        label: 'Journey Management',
        icon: 'journeys',
        path: '/admin/journeys',
      },
      {
        label: 'Access Log',
        icon: 'applications',
        path: '/admin/audit',
      },
      {
        label: 'Metrics',
        icon: 'metrics',
        path: '/admin/metrics',
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

          <span
            className="setu-notification"
            title="No new notifications"
            aria-label="Notifications"
          >
            <svg
              viewBox="0 0 24 24"
              width="19"
              height="19"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 9a6 6 0 0 1 12 0c0 5 2 5 2 7H4c0-2 2-2 2-7Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M10 19a2.5 2.5 0 0 0 4 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
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
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === `/${role}` || item.path === '/officer' || item.path === '/admin'}
                className={({ isActive }) =>
                  `setu-nav-item${isActive ? ' active' : ''}`
                }
              >
                <span
                  className="setu-nav-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {item.icon === 'home' && (
                      <>
                        <path d="M3 10.5 12 3l9 7.5" />
                        <path d="M5.5 9.5V21h13V9.5" />
                        <path d="M9.5 21v-6h5v6" />
                      </>
                    )}
                    {item.icon === 'services' && (
                      <>
                        <rect x="4" y="4" width="6" height="6" rx="1" />
                        <rect x="14" y="4" width="6" height="6" rx="1" />
                        <rect x="4" y="14" width="6" height="6" rx="1" />
                        <rect x="14" y="14" width="6" height="6" rx="1" />
                      </>
                    )}
                    {item.icon === 'applications' && (
                      <>
                        <rect x="5" y="3" width="14" height="18" rx="2" />
                        <path d="M8 8h8M8 12h8M8 16h5" />
                      </>
                    )}
                    {item.icon === 'decisions' && (
                      <>
                        <path d="m5 6 4 4 8-7" />
                        <path d="M5 18h14" />
                        <path d="M5 14h8" />
                      </>
                    )}
                    {item.icon === 'consent' && (
                      <>
                        <path d="M12 3 19 6v5c0 4.7-3 7.8-7 10-4-2.2-7-5.3-7-10V6l7-3Z" />
                        <path d="m9 12 2 2 4-4" />
                      </>
                    )}
                    {item.icon === 'systems' && (
                      <>
                        <rect x="4" y="4" width="6" height="6" rx="1" />
                        <rect x="14" y="4" width="6" height="6" rx="1" />
                        <rect x="4" y="14" width="6" height="6" rx="1" />
                        <rect x="14" y="14" width="6" height="6" rx="1" />
                      </>
                    )}
                    {item.icon === 'studio' && (
                      <>
                        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                        <circle cx="12" cy="12" r="3.5" />
                        <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                      </>
                    )}
                    {item.icon === 'journeys' && (
                      <>
                        <path d="M5 7h14M5 17h14" />
                        <circle cx="8" cy="7" r="2" />
                        <circle cx="16" cy="17" r="2" />
                      </>
                    )}
                    {item.icon === 'metrics' && (
                      <>
                        <path d="M5 19V9M12 19V5M19 19v-8" />
                        <path d="M3 19h18" />
                      </>
                    )}
                    {item.icon === 'help' && (
                      <>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9.8 9a2.3 2.3 0 1 1 3.8 1.8c-.9.7-1.6 1.1-1.6 2.4" />
                        <path d="M12 16.5h.01" />
                      </>
                    )}
                  </svg>
                </span>

                <span className="setu-nav-label">
                  <strong>{item.label}</strong>
                  <small>{item.marathi || ''}</small>
                </span>
              </NavLink>
            ))}
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
        <nav className="setu-shell-footer-links" aria-label="Footer information">
          <span>About</span>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Help</span>
        </nav>

        <span>
          MAHA SETU · Unified Government Services
        </span>

        <span>
          Synthetic conceptual prototype · Not affiliated with Government of Maharashtra.
        </span>
      </footer>
    </div>
  )
}

export default DashboardLayout
