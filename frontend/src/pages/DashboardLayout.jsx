import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearAuthSession, getAuthUser } from '../auth/storage'

function DashboardLayout() {
  const navigate = useNavigate()
  const user = getAuthUser()

  const role = user?.role || 'citizen'

  const navigation = {
    citizen: [
      { label: 'Dashboard', icon: '⌂', path: '/citizen' },
      { label: 'Apply for Schemes', icon: '▣', path: '/citizen' },
      { label: 'My Applications', icon: '▤', path: '/citizen' },
      { label: 'Consent & Data', icon: '◈', path: '/citizen/consents' },
      { label: 'My Profile', icon: '♙', path: '/citizen/profile' },
      { label: 'Help & Support', icon: '?', path: '/citizen' },
    ],

    officer: [
      { label: 'Dashboard', icon: '⌂', path: '/officer' },
      { label: 'Applications', icon: '▤', path: '/officer' },
      { label: 'Verify & Approve', icon: '✓', path: '/officer' },
      { label: 'Reports', icon: '▥', path: '/officer' },
      { label: 'System Status', icon: '◉', path: '/officer' },
    ],

    admin: [
      { label: 'Dashboard', icon: '⌂', path: '/admin' },
      { label: 'Manage Systems', icon: '▣', path: '/admin/systems' },
      { label: 'Onboarding Studio', icon: '⚙', path: '/admin/studio' },
      { label: 'Journey Management', icon: '↔', path: '/admin/journeys' },
      { label: 'Access Log', icon: '▤', path: '/admin/audit' },
      { label: 'Reports', icon: '▥', path: '/admin' },
    ],

    recruiter: [
      { label: 'Dashboard', icon: '⌂', path: '/recruiter' },
      { label: 'Candidates', icon: '♙', path: '/recruiter' },
      { label: 'Applications', icon: '▤', path: '/recruiter' },
      { label: 'Matching', icon: '◎', path: '/recruiter' },
      { label: 'Reports', icon: '▥', path: '/recruiter' },
    ],
  }

  const items = navigation[role] || navigation.citizen

  function handleLogout() {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  const roleName = {
    citizen: 'Citizen',
    officer: 'Government Official',
    admin: 'Administrator',
    recruiter: 'Recruiter',
  }[role] || 'User'

  return (
    <div className="setu-app-shell">
      <header className="setu-topbar">
        <div className="setu-brand">
          <div className="setu-brand-mark">MS</div>

          <div>
            <strong>MahaSetu</strong>
            <span>Unified Digital Services</span>
          </div>
        </div>

        <div className="setu-topbar-right">
          <span className="setu-language">EN | मराठी</span>
          <button className="setu-notification" type="button">
            ♢
          </button>

          <div className="setu-user">
            <div className="setu-avatar">
              {(user?.display_name || user?.username || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="setu-user-info">
              <strong>{user?.display_name || user?.username || 'User'}</strong>
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

          <nav className="setu-sidebar-nav">
            {items.map((item) => (
              <NavLink
                key={`${item.label}-${item.path}`}
                to={item.path}
                end={item.path === `/${role}`}
                className={({ isActive }) =>
                  `setu-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <span className="setu-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="setu-sidebar-footer">
            <span>SETU Prototype</span>
            <small>Unified Government Services</small>
          </div>
        </aside>

        <main className="setu-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout