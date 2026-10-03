import {
  useEffect,
  useState,
} from 'react'
import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom'

import { apiRequest } from '../api/client.js'
import {
  ATTENTION_STATUSES,
  getStatusLabel,
} from '../constants/statusLabels.js'
import { getJourneyLabel } from '../constants/journeyLabels.js'
import {
  getRoleLabel,
  getRoleNavigation,
  ROLE_HOME,
} from '../constants/navigation.js'
import {
  clearAuthSession,
  getAuthUser,
} from '../auth/storage'

function NavIcon({ icon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon === 'home' && (
        <>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M9.5 21v-6h5v6" />
        </>
      )}

      {icon === 'services' && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </>
      )}

      {icon === 'applications' && (
        <>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </>
      )}

      {icon === 'decisions' && (
        <>
          <path d="m5 6 4 4 8-7" />
          <path d="M5 14h8" />
          <path d="M5 18h14" />
        </>
      )}

      {icon === 'consent' && (
        <>
          <path d="M12 3 19 6v5c0 4.7-3 7.8-7 10-4-2.2-7-5.3-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}

      {icon === 'systems' && (
        <>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </>
      )}

      {icon === 'studio' && (
        <>
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </>
      )}

      {icon === 'journeys' && (
        <>
          <path d="M5 7h14" />
          <path d="m15 4 3 3-3 3" />
          <path d="M19 17H5" />
          <path d="m9 14-3 3 3 3" />
        </>
      )}

      {icon === 'metrics' && (
        <>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
        </>
      )}

      {icon === 'help' && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9a2.4 2.4 0 1 1 4 1.8c-1.1.7-1.6 1.2-1.6 2.7" />
          <path d="M12 17h.01" />
        </>
      )}
    </svg>
  )
}

function NotificationIcon() {
  return (
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
  )
}

function DashboardLayout() {
  const navigate = useNavigate()
  const user = getAuthUser()
  const role = user?.role || 'citizen'

  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem('setu-language') === 'mr'
        ? 'mr'
        : 'en'
    } catch {
      return 'en'
    }
  })

  const [notificationsOpen, setNotificationsOpen] =
    useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] =
    useState(false)



  const [profileOpen, setProfileOpen] = useState(false)
const items = getRoleNavigation(role)

  const homePath =
    ROLE_HOME[role] || ROLE_HOME.citizen

  const roleName = getRoleLabel(role, language)


  const profilePath = `${homePath}/profile`
useEffect(() => {
    try {
      localStorage.setItem('setu-language', language)
    } catch {
      // Local storage is optional.
    }
  }, [language])

  async function loadNotifications() {
    setNotificationsLoading(true)

    try {
      if (role === 'admin') {
        const result = await apiRequest('/api/systems')
        const systems = Array.isArray(result)
          ? result
          : []

        const attention = systems.filter(
          (system) =>
            system.health !== 'UP' ||
            system.simulate_down,
        )

        if (attention.length > 0) {
          setNotifications([
            {
              id: 'admin-systems-attention',
              title: `${attention.length} system${attention.length === 1 ? '' : 's'} need attention`,
              body: attention
                .map(
                  (system) =>
                    system.name ||
                    system.code,
                )
                .join(' · '),
              path: '/admin/systems',
            },
          ])
        } else {
          setNotifications([
            {
              id: 'admin-systems-healthy',
              title: 'Connected systems are healthy',
              body: `${systems.length} connected system${systems.length === 1 ? '' : 's'} checked.`,
              path: '/admin/systems',
            },
          ])
        }

        return
      }

      const result = await apiRequest(
        '/api/applications?limit=50&offset=0',
      )

      const applications = Array.isArray(result)
        ? result
        : Array.isArray(result?.items)
          ? result.items
          : []

      if (role === 'citizen') {
        const latest = [...applications].sort(
          (left, right) =>
            new Date(right.updated_at || right.created_at || 0) -
            new Date(left.updated_at || left.created_at || 0),
        )[0]

        if (!latest) {
          setNotifications([])
          return
        }

        setNotifications([
          {
            id: `citizen-application-${latest.id}`,
            title: getStatusLabel(latest.status),
            body: `${getJourneyLabel(latest.journey_id)} · APP-${String(latest.id).padStart(6, '0')}`,
            path: `/citizen/applications/${latest.id}`,
          },
        ])

        return
      }

      const attention = applications.filter(
        (application) =>
          ATTENTION_STATUSES.has(
            application.status,
          ),
      )

      if (attention.length > 0) {
        setNotifications([
          {
            id: 'officer-attention-queue',
            title: `${attention.length} application${attention.length === 1 ? '' : 's'} need attention`,
            body: 'Open the approval queue to review pending work.',
            path: '/officer/applications',
          },
        ])
      } else {
        setNotifications([
          {
            id: 'officer-clear-queue',
            title: 'Approval queue is clear',
            body: 'No applications currently require attention.',
            path: '/officer/applications',
          },
        ])
      }
    } catch (error) {
      setNotifications([
        {
          id: 'notification-error',
          title: 'Notifications unavailable',
          body:
            error?.message ||
            'The latest notification state could not be loaded.',
        },
      ])
    } finally {
      setNotificationsLoading(false)
    }
  }
  function handleLogout() {
    clearAuthSession()
    navigate('/login', { replace: true })
  }

  function handleNotificationToggle() {
    const nextState = !notificationsOpen
    setNotificationsOpen(nextState)

    if (nextState) {
      void loadNotifications()
    }
  }

  function navigateFromNotification(path) {
    if (!path) return

    setNotificationsOpen(false)
    navigate(path)
  }

  function primaryLabel(item) {
    if (language === 'mr' && item.marathi) {
      return item.marathi
    }

    return item.label
  }

  function secondaryLabel(item) {
    if (language === 'mr' && item.marathi) {
      return item.label
    }

    return item.marathi || ''
  }

  return (
    <div className="setu-app-shell">
      <header className="setu-topbar">
        <NavLink
          className="setu-brand setu-brand-enhanced"
          to={homePath}
          aria-label="MAHA SETU home"
          end
          onClick={() => {
            setNotificationsOpen(false)
            setProfileOpen(false)
          }}
        >
          <span
            className="setu-brand-mark setu-brand-mark-enhanced"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="2"
                y="2"
                width="44"
                height="44"
                rx="14"
                fill="rgba(255,255,255,0.14)"
                stroke="rgba(255,255,255,0.32)"
              />
              <path
                d="M11 28.5C13.8 22.6 18.3 19.5 24 19.5C29.7 19.5 34.2 22.6 37 28.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <path
                d="M11 31.5H37"
                stroke="#F7C948"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="13" cy="17" r="3" fill="#F7C948" />
              <circle cx="24" cy="13" r="3" fill="#F7C948" />
              <circle cx="35" cy="17" r="3" fill="#F7C948" />
            </svg>
          </span>

          <span className="setu-brand-copy setu-brand-copy-enhanced">
            <strong>MAHA SETU</strong>
            <span>Unified Government Services</span>
          </span>
        </NavLink>

        <div className="setu-topbar-right">
          <button
            className="setu-language-toggle setu-topbar-language"
            type="button"
            onClick={() =>
              setLanguage((current) =>
                current === 'en' ? 'mr' : 'en',
              )
            }
            aria-label="Change navigation language"
            aria-pressed={language === 'mr'}
            title="Change navigation language"
          >
            {language === 'en'
              ? 'EN | मराठी'
              : 'मराठी | EN'}
          </button>

          <div className="setu-notification-wrap">
            <button
              className="setu-notification-button"
              type="button"
              onClick={handleNotificationToggle}
              aria-label="Open notifications"
              aria-expanded={notificationsOpen}
              title="Notifications"
            >
              <NotificationIcon />
              {notifications.length > 0 && (
                <span
                  className="setu-notification-count"
                  aria-label={`${notifications.length} notification`}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div
                className="setu-notification-panel"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="setu-notification-panel-header">
                  <div>
                    <strong>
                      {language === 'mr'
                        ? 'सूचना'
                        : 'Notifications'}
                    </strong>
                    <small>
                      {language === 'mr'
                        ? 'अद्ययावत प्रणाली स्थिती'
                        : 'Latest service state'}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="setu-notification-refresh"
                    onClick={() =>
                      void loadNotifications()
                    }
                    disabled={notificationsLoading}
                  >
                    {notificationsLoading
                      ? '…'
                      : '↻'}
                  </button>
                </div>

                <div className="setu-notification-list">
                  {notificationsLoading && (
                    <p
                      className="setu-notification-empty"
                      aria-live="polite"
                    >
                      Loading…
                    </p>
                  )}

                  {!notificationsLoading &&
                    notifications.length === 0 && (
                      <p className="setu-notification-empty">
                        {language === 'mr'
                          ? 'सध्या नवीन सूचना नाहीत.'
                          : 'No new notifications.'}
                      </p>
                    )}

                  {!notificationsLoading &&
                    notifications.map(
                      (notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className="setu-notification-item"
                          onClick={() =>
                            navigateFromNotification(
                              notification.path,
                            )
                          }
                          disabled={!notification.path}
                        >
                          <strong>
                            {notification.title}
                          </strong>
                          <span>
                            {notification.body}
                          </span>
                        </button>
                      ),
                    )}
                </div>
              </div>
            )}
          </div>

          <div className="setu-profile-menu">
            <button
              className="setu-profile-trigger"
              type="button"
              onClick={() => {
                setProfileOpen((current) => !current)
                setNotificationsOpen(false)
              }}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label="Open profile menu"
            >
              <span
                className="setu-avatar setu-profile-avatar"
                aria-hidden="true"
              >
                {(user?.display_name ||
                  user?.username ||
                  'U')
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <span className="setu-user-info">
                <strong>
                  {user?.display_name ||
                    user?.username ||
                    'User'}
                </strong>
                <span>{roleName}</span>
              </span>

              <span
                className={`setu-profile-chevron${
                  profileOpen ? ' open' : ''
                }`}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path
                    d="m5 7.5 5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>

            {profileOpen && (
              <div
                className="setu-profile-dropdown"
                role="menu"
                aria-label="Account menu"
              >
                <div className="setu-profile-dropdown-head">
                  <span className="setu-profile-mini-avatar">
                    {(user?.display_name ||
                      user?.username ||
                      'U')
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <strong>
                      {user?.display_name ||
                        user?.username ||
                        'User'}
                    </strong>
                    <span>{roleName}</span>
                  </div>
                </div>

                <div className="setu-profile-dropdown-divider" />

                <NavLink
                  className="setu-profile-menu-item"
                  to={profilePath}
                  role="menuitem"
                  onClick={() => setProfileOpen(false)}
                >
                  <span aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
                    </svg>
                  </span>

                  <span>
                    {language === 'mr'
                      ? 'माझे प्रोफाइल'
                      : 'My Profile'}
                  </span>
                </NavLink>

                <button
                  className="setu-profile-menu-item setu-profile-menu-danger"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false)
                    handleLogout()
                  }}
                >
                  <span aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
                      <path d="M14 8l4 4-4 4" />
                      <path d="M18 12H9" />
                    </svg>
                  </span>

                  <span>
                    {language === 'mr'
                      ? 'बाहेर पडा'
                      : 'Logout'}
                  </span>
                </button>
              </div>
            )}
          </div>

      </div>
      </header>

      <div className="setu-body">
        <aside className="setu-sidebar">
          <div className="setu-sidebar-role">
            <span>
              {language === 'mr'
                ? 'सध्याची भूमिका'
                : 'Current role'}
            </span>
            <strong>{roleName}</strong>
          </div>

          <nav
            className="setu-sidebar-nav"
            aria-label="Primary navigation"
          >
            {items.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={Boolean(item.end)}
                onClick={() => setNotificationsOpen(false)}
                className={({ isActive }) =>
                  `setu-nav-item${
                    isActive ? ' active' : ''
                  }`
                }
              >
                <span
                  className="setu-nav-icon"
                  aria-hidden="true"
                >
                  <NavIcon icon={item.icon} />
                </span>

                <span className="setu-nav-label">
                  <strong>{primaryLabel(item)}</strong>

                  {secondaryLabel(item) && (
                    <small>
                      {secondaryLabel(item)}
                    </small>
                  )}
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
        <span>
          MAHA SETU · Unified Government Services
        </span>

        <span>
          Conceptual prototype — not affiliated with
          Government of Maharashtra.
        </span>
      </footer>
    </div>
  )
}

export default DashboardLayout
