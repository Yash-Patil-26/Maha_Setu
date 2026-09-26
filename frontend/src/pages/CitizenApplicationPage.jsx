import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { getAccessToken, getAuthUser } from '../auth/storage'
import '../citizen-ui.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function normalizeApplication(data, id) {
  return {
    ...data,
    id: data.id ?? data.application_id ?? id,
    steps: Array.isArray(data.steps) ? data.steps : [],
    canonical: data.canonical || {},
    provenance: data.provenance || {},
    metrics: data.metrics || {
      fields_total: 0,
      fields_autofilled: 0,
      citizen_typed: 0,
      documents_not_uploaded: 0,
    },
  }
}

function CitizenApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const user = getAuthUser()
  const displayName =
    user?.display_name || user?.username || 'Citizen'

  useEffect(() => {
    let active = true

    async function loadApplication() {
      try {
        setLoading(true)
        setError('')

        const token = getAccessToken()

        if (!token) {
          throw new Error('Your session has expired. Please log in again.')
        }

        const response = await fetch(
          `${API_BASE_URL}/api/applications/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        const data = await response.json().catch(() => ({}))

        if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.')
        }

        if (response.status === 404) {
          throw new Error('Application not found.')
        }

        if (!response.ok) {
          throw new Error(
            data.detail || `Failed to load application (${response.status})`,
          )
        }

        if (active) {
          setApplication(normalizeApplication(data, id))
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load application.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadApplication()

    const timer = window.setInterval(loadApplication, 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [id])

  if (loading && !application) {
    return (
      <main className="citizen-page">
        <section className="citizen-content">
          <div className="citizen-empty-state">
            <h1>Loading Application...</h1>
            <p>Fetching your live application from MahaSetu.</p>
          </div>
        </section>
      </main>
    )
  }

  if (error && !application) {
    return (
      <main className="citizen-page">
        <section className="citizen-content">
          <div className="citizen-empty-state">
            <h1>Application Unavailable</h1>
            <p>{error}</p>

            <button
              className="primary-action"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              Back to Dashboard
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="citizen-page">
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
            EN
          </span>

          <div className="citizen-user-menu">
            <div className="citizen-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <span>{displayName}</span>
          </div>
        </div>
      </header>

      <div className="citizen-layout">
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
              <span>�</span>

              <div>
                <strong>Dashboard</strong>
                <small>Main Dashboard</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              <span>?</span>

              <div>
                <strong>Apply for Schemes</strong>
                <small>Scheme Applications</small>
              </div>
            </button>

            <button
              className="citizen-nav-item active"
              type="button"
            >
              <span>?</span>

              <div>
                <strong>My Applications</strong>
                <small>Applications</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>?</span>

              <div>
                <strong>Consent &amp; Data</strong>
                <small>Consent &amp; Data</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>?</span>

              <div>
                <strong>My Profile</strong>
                <small>My Profile</small>
              </div>
            </button>
          </nav>
        </aside>

        <section className="citizen-content">
          <div className="citizen-breadcrumb">
            Home
            <span>�</span>
            My Applications
            <span>�</span>
            Application #{application.id}
          </div>

          <section className="application-page-header">
            <div className="application-header-icon">
              ??
            </div>

            <div>
              <span className="eyebrow">
                {application.journey_id || 'Government Service'}
              </span>

              <h1>
                Application #{application.id}
              </h1>

              <p>
                Live application status from MahaSetu.
              </p>
            </div>

            <span className="status-pill status-progress">
              {application.status || 'UNKNOWN'}
            </span>
          </section>

          <section className="citizen-card">
            <div className="card-title-row">
              <div>
                <h2>Application Tracking</h2>
                <p>
                  Track your application through every processing stage.
                </p>
              </div>

              <span className="application-number">
                APP#{application.id}
              </span>
            </div>

            <Timeline steps={application.steps} />
          </section>

          <div className="application-content-grid">
            <div>
              <section className="citizen-card">
                <div className="card-title-row">
                  <div>
                    <h2>Application Progress</h2>
                    <p>
                      Live processing activity for your application.
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

            <aside>
              <section className="citizen-card current-status-card">
                <div className="card-title-row">
                  <div>
                    <h2>Current Status</h2>
                    <p>
                      Latest status received from SETU.
                    </p>
                  </div>
                </div>

                <div className="current-status-icon">
                  ?
                </div>

                <strong>
                  {application.status || 'UNKNOWN'}
                </strong>

                {application.current_step && (
                  <p>
                    Current step: {application.current_step}
                  </p>
                )}

                {application.outcome && (
                  <p>
                    Outcome: {application.outcome}
                  </p>
                )}

                <p className="application-correlation">
                  Correlation ID: {application.correlation_id || '�'}
                </p>
              </section>

              <OnceOnlyMeter metrics={application.metrics} />
            </aside>
          </div>

          {error && (
            <div className="citizen-error" role="alert">
              <strong>Connection update failed</strong>
              <span>{error}</span>
            </div>
          )}

          <footer className="citizen-footer">
            <div>
              <span>About MahaSetu</span>
              <span>Privacy Policy</span>
              <span>Help &amp; Support</span>
            </div>

            <small>
              MahaSetu � Digital Service Integration Prototype
            </small>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default CitizenApplicationPage
