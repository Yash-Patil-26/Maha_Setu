import { useParams, useNavigate } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { CITIZEN_APPLICATION_DETAIL } from '../fixtures/applicationDetail'
import { getAuthUser } from '../auth/storage'
import '../citizen-ui.css'

function CitizenApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const application = {
    ...CITIZEN_APPLICATION_DETAIL,
    id,
  }

  const user = getAuthUser()

  const displayName =
    user?.display_name || user?.username || 'Citizen'

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
          <strong>
            Maha<span>Setu</span>
          </strong>

          <small>
            Unified Platform for Government Services
          </small>
        </div>

        <div className="citizen-top-actions">
          <span className="citizen-language">
            EN | मराठी
          </span>

          <button
            className="citizen-icon-button"
            type="button"
          >
            🔔
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
              className="citizen-nav-item"
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
              onClick={() => navigate('/citizen')}
            >
              <span>▣</span>

              <div>
                <strong>Apply for Schemes</strong>
                <small>योजना अर्ज</small>
              </div>
            </button>

            <button
              className="citizen-nav-item active"
              type="button"
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
        </aside>

        {/* CONTENT */}
        <section className="citizen-content">
          <div className="citizen-breadcrumb">
            Home
            <span>›</span>
            My Applications
            <span>›</span>
            Application #{application.id}
          </div>

          {/* APPLICATION HEADER */}
          <section className="application-page-header">
            <div className="application-header-icon">
              🎓
            </div>

            <div>
              <span className="eyebrow">
                Post Matric Scholarship
              </span>

              <h1>
                Application #{application.id}
              </h1>

              <p>
                Your application has been created
                successfully and is being processed.
              </p>
            </div>

            <span className="status-pill status-progress">
              ● In Progress
            </span>
          </section>

          {/* STATUS STEPPER */}
          <section className="citizen-card">
            <div className="card-title-row">
              <div>
                <h2>Application Tracking</h2>
                <p>
                  Track your application through
                  every processing stage.
                </p>
              </div>

              <span className="application-number">
                APP#{application.id}
              </span>
            </div>

            <div className="tracking-stepper">
              <div className="tracking-step completed">
                <div className="tracking-circle">
                  ✓
                </div>

                <strong>Application Submitted</strong>
                <small>Completed</small>
              </div>

              <div className="tracking-line completed" />

              <div className="tracking-step current">
                <div className="tracking-circle">
                  2
                </div>

                <strong>Data Verification</strong>
                <small>In Progress</small>
              </div>

              <div className="tracking-line" />

              <div className="tracking-step">
                <div className="tracking-circle">
                  3
                </div>

                <strong>Eligibility Check</strong>
                <small>Pending</small>
              </div>

              <div className="tracking-line" />

              <div className="tracking-step">
                <div className="tracking-circle">
                  4
                </div>

                <strong>Final Approval</strong>
                <small>Pending</small>
              </div>
            </div>
          </section>

          <div className="application-content-grid">
            {/* MAIN */}
            <div>
              <section className="citizen-card">
                <div className="card-title-row">
                  <div>
                    <h2>Application Progress</h2>
                    <p>
                      Processing activity for your
                      application.
                    </p>
                  </div>
                </div>

                <Timeline steps={application.steps} />
              </section>

              <DataCard
                canonical={application.canonical}
                provenance={application.provenance}
              />
            </div>

            {/* SIDE */}
            <aside>
              <section className="citizen-card current-status-card">
                <div className="current-status-icon">
                  🔐
                </div>

                <h2>Current Status</h2>

                <span className="status-pill status-progress">
                  In Progress
                </span>

                <p>
                  Your application is currently under
                  data verification. MahaSetu is
                  fetching and verifying information
                  from relevant departments.
                </p>

                <div className="status-detail">
                  <span>Application ID</span>
                  <strong>
                    #{application.id}
                  </strong>
                </div>

                <div className="status-detail">
                  <span>Journey</span>
                  <strong>
                    Scholarship
                  </strong>
                </div>
              </section>

              <section className="citizen-card">
                <h2>Once-only Benefit</h2>

                <OnceOnlyMeter
                  metrics={application.metrics}
                />
              </section>
            </aside>
          </div>

          <div className="tracking-note">
            <strong>🔒 Your data is protected</strong>

            <span>
              Only consented information is used for
              processing this application.
            </span>
          </div>

          <button
            className="back-dashboard-button"
            type="button"
            onClick={() => navigate('/citizen')}
          >
            ← Back to Dashboard
          </button>

          <footer className="citizen-footer">
            <div>
              <span>About MahaSetu</span>
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

export default CitizenApplicationPage