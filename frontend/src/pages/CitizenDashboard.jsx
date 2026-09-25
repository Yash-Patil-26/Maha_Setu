import { useNavigate } from 'react-router-dom'
import { CITIZEN_SERVICES } from '../fixtures/citizen'
import { clearAuthSession, getAuthUser } from '../auth/storage'
import '../citizen-ui.css'

function CitizenDashboard() {
  const navigate = useNavigate()
  const user = getAuthUser()

  const displayName = user?.display_name || user?.username || 'Citizen'

  function handleLogout() {
    clearAuthSession()
    navigate('/login')
  }

  function goToService(journeyId) {
    navigate(`/citizen/apply/${journeyId}`)
  }

  return (
    <main className="citizen-page">
      {/* TOP HEADER */}
      <header className="citizen-topbar">
        <div className="citizen-brand">
          <div className="citizen-gov-mark">
            MS
          </div>

          <div>
            <div className="citizen-gov-name">
              MahaSetu
            </div>

            <div className="citizen-gov-subtitle">
              Digital Service Prototype
            </div>
          </div>
        </div>

        <div className="citizen-logo">
          <strong>Maha<span>Setu</span></strong>
          <small>Unified Platform for Government Services</small>
        </div>

        <div className="citizen-top-actions">
          <span className="citizen-language">EN | मराठी</span>

          <button
            className="citizen-icon-button"
            type="button"
            aria-label="Notifications"
          >
            🔔
            <span className="notification-dot" />
          </button>

          <div className="citizen-user-menu">
            <div className="citizen-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <span>{displayName}</span>
            <span className="user-chevron">⌄</span>
          </div>
        </div>
      </header>

      <div className="citizen-layout">
        {/* SIDEBAR */}
        <aside className="citizen-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Citizen</span>
            </div>
          </div>

          <nav className="citizen-nav">
            <button
              className="citizen-nav-item active"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              <span>⌂</span>
              <div>
                <strong>Dashboard</strong>
                <small>मुख्य पृष्ठ</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => {
                const firstService = CITIZEN_SERVICES[0]
                if (firstService) {
                  goToService(firstService.journeyId)
                }
              }}
            >
              <span>▣</span>
              <div>
                <strong>Apply for Schemes</strong>
                <small>योजना अर्ज</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => {
                const applicationId = localStorage.getItem(
                  'last_citizen_application_id',
                )

                if (applicationId) {
                  navigate(`/citizen/applications/${applicationId}`)
                }
              }}
            >
              <span>▤</span>
              <div>
                <strong>My Applications</strong>
                <small>माझे अर्ज</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>♢</span>
              <div>
                <strong>Consent &amp; Data</strong>
                <small>संमती व डेटा</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>♙</span>
              <div>
                <strong>My Profile</strong>
                <small>माझे प्रोफाइल</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>?</span>
              <div>
                <strong>Help &amp; Support</strong>
                <small>मदत व सहाय्य</small>
              </div>
            </button>
          </nav>

          <div className="sidebar-bottom">
            <button
              className="sidebar-logout"
              type="button"
              onClick={handleLogout}
            >
              ⇥ Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="citizen-content">
          <div className="citizen-breadcrumb">
            Home <span>›</span> Citizen Dashboard
          </div>

          {/* WELCOME */}
          <section className="citizen-welcome">
            <div>
              <p className="eyebrow">Citizen Services</p>

              <h1>
                Good Morning, {displayName}
              </h1>

              <p>
                Access government services, apply for schemes and
                track your applications from one place.
              </p>
            </div>

            <div className="welcome-illustration">
              <div className="welcome-circle">✦</div>
              <span>Seamless Services</span>
              <small>Stronger Maharashtra</small>
            </div>
          </section>

          {/* POPULAR SCHEMES */}
          <div className="section-heading">
            <div>
              <h2>Popular Schemes</h2>
              <p>Explore available government services</p>
            </div>

            <button
              className="text-link"
              type="button"
              onClick={() => {
                const firstService = CITIZEN_SERVICES[0]
                if (firstService) {
                  goToService(firstService.journeyId)
                }
              }}
            >
              View All →
            </button>
          </div>

          <section className="scheme-grid">
            {CITIZEN_SERVICES.map((service, index) => (
              <article
                className={`scheme-card scheme-card-${index + 1}`}
                key={service.journeyId}
              >
                <div className="scheme-icon">
                  {index === 0 ? '🎓' : index === 1 ? '👥' : '💼'}
                </div>

                <span className="scheme-category">
                  {index === 0
                    ? 'Students'
                    : index === 1
                      ? 'Employment'
                      : 'Skills'}
                </span>

                <h3>{service.title}</h3>

                <p>{service.description}</p>

                <button
                  type="button"
                  onClick={() => goToService(service.journeyId)}
                >
                  Apply Now →
                </button>
              </article>
            ))}
          </section>

          {/* APPLICATIONS */}
          <div className="section-heading application-heading">
            <div>
              <h2>Your Applications</h2>
              <p>Track the progress of your submitted applications</p>
            </div>

            <button
              className="text-link"
              type="button"
              onClick={() => {
                const applicationId = localStorage.getItem(
                  'last_citizen_application_id',
                )

                if (applicationId) {
                  navigate(`/citizen/applications/${applicationId}`)
                }
              }}
            >
              View All →
            </button>
          </div>

          <section className="application-list">
            <article className="application-row">
              <div className="application-service-icon">
                🎓
              </div>

              <div className="application-info">
                <strong>
                  Post Matric Scholarship
                </strong>

                <span>
                  Scholarship Application
                </span>
              </div>

              <span className="status-pill status-progress">
                In Progress
              </span>

              <span className="application-date">
                Last updated today
              </span>

              <button
                className="application-arrow"
                type="button"
                onClick={() => {
                  const applicationId = localStorage.getItem(
                    'last_citizen_application_id',
                  )

                  if (applicationId) {
                    navigate(`/citizen/applications/${applicationId}`)
                  }
                }}
              >
                →
              </button>
            </article>

            <div className="empty-application-note">
              Your latest application will appear here after submission.
            </div>
          </section>

          {/* QUICK INFO */}
          <section className="citizen-info-grid">
            <article className="info-card">
              <span className="info-icon">🔐</span>

              <div>
                <strong>Your Data, Your Control</strong>
                <p>
                  You control consent for accessing your information
                  from government departments.
                </p>
              </div>
            </article>

            <article className="info-card">
              <span className="info-icon">⚡</span>

              <div>
                <strong>Faster Applications</strong>
                <p>
                  Reduce repeated document submission with secure
                  data sharing.
                </p>
              </div>
            </article>

            <article className="info-card">
              <span className="info-icon">✓</span>

              <div>
                <strong>Transparent Tracking</strong>
                <p>
                  Track your application status at every stage.
                </p>
              </div>
            </article>
          </section>

          <footer className="citizen-footer">
            <div>
              <span>About MahaSetu</span>
              <span>Terms of Use</span>
              <span>Privacy Policy</span>
              <span>Help &amp; Support</span>
            </div>

            <small>
              MahaSetu — Digital Service Integration Prototype
            </small>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default CitizenDashboard