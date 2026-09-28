import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function AdminDashboard() {
  const navigate = useNavigate()

  const [systems, setSystems] = useState([])
  const [journeys, setJourneys] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function refreshDashboard({ initial = false } = {}) {
    if (initial) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')

    try {
      const [systemsData, journeysData, metricsData] =
        await Promise.all([
          apiRequest('/api/systems'),
          apiRequest('/api/journeys'),
          apiRequest('/api/metrics/summary'),
        ])

      setSystems(Array.isArray(systemsData) ? systemsData : [])
      setJourneys(Array.isArray(journeysData) ? journeysData : [])
      setMetrics(metricsData || {})
    } catch (err) {
      setError(
        err.message || 'Failed to load Admin dashboard data',
      )
    } finally {
      if (initial) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiRequest('/api/systems'),
      apiRequest('/api/journeys'),
      apiRequest('/api/metrics/summary'),
    ])
      .then(([systemsData, journeysData, metricsData]) => {
        if (cancelled) return

        setSystems(
          Array.isArray(systemsData) ? systemsData : [],
        )
        setJourneys(
          Array.isArray(journeysData) ? journeysData : [],
        )
        setMetrics(metricsData || {})
      })
      .catch((err) => {
        if (cancelled) return

        setError(
          err.message || 'Failed to load Admin dashboard data',
        )
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const connectedSystems = systems.length

  const healthySystems = systems.filter(
    (system) =>
      String(system.health || '').toUpperCase() === 'UP' &&
      !system.simulate_down,
  ).length

  const healthPercent = connectedSystems
    ? Math.round((healthySystems / connectedSystems) * 100)
    : 0

  const activeJourneys = journeys.filter(
    (journey) =>
      String(journey.status || '').toUpperCase() === 'ACTIVE',
  ).length

  const totalApplications =
    Number(metrics?.once_only?.applications || 0)

  const autofillPercent =
    Number(metrics?.once_only?.autofill_pct || 0)

  const displayedSystems = systems.slice(0, 4)

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Admin Dashboard
          </div>

          <h1>Admin Dashboard</h1>

          <p>
            Monitor connected systems, service journeys and
            interoperability activity across MahaSetu.
          </p>
        </div>

        <button
          className="setu-secondary-button"
          type="button"
          onClick={() => refreshDashboard()}
          disabled={loading || refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <section className="setu-content-card">
          <p className="setu-error-message">{error}</p>
        </section>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Connected Systems</span>
          <strong>{connectedSystems}</strong>
          <small>Live system registry</small>
        </article>

        <article className="setu-stat-card">
          <span>Active Journeys</span>
          <strong>{activeJourneys}</strong>
          <small>Configured active journeys</small>
        </article>

        <article className="setu-stat-card">
          <span>Applications</span>
          <strong>{totalApplications}</strong>
          <small>Tracked by SETU</small>
        </article>

        <article className="setu-stat-card">
          <span>System Health</span>
          <strong>{healthPercent}%</strong>
          <small>
            {healthySystems} of {connectedSystems} systems UP
          </small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Connected Systems</h2>
            <p>
              Live registry state returned by the SETU systems service.
            </p>
          </div>

          <button
            className="setu-primary-button"
            type="button"
            onClick={() => navigate('/admin/systems')}
          >
            Manage Systems
          </button>
        </div>

        {loading ? (
          <p>Loading connected systems...</p>
        ) : systems.length === 0 ? (
          <p>No connected systems are currently registered.</p>
        ) : (
          <div className="setu-system-grid">
            {displayedSystems.map((system) => {
              const isUp =
                String(system.health || '').toUpperCase() === 'UP' &&
                !system.simulate_down

              return (
                <article
                  className="setu-system-card"
                  key={system.code}
                >
                  <div className="setu-system-card-top">
                    <div className="setu-system-icon">
                      {system.code}
                    </div>

                    <span
                      className={`setu-status ${
                        isUp ? 'success' : 'pending'
                      }`}
                    >
                      {system.health}
                    </span>
                  </div>

                  <div className="setu-system-info">
                    <h3>{system.name}</h3>

                    <p>
                      {system.protocol} · {system.auth_type}
                    </p>

                    <small>
                      Owner: {system.owner_department}
                    </small>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Operational Signals</h2>
            <p>
              Metrics calculated from live application and onboarding data.
            </p>
          </div>
        </div>

        <div className="setu-detail-grid">
          <div>
            <span>Applications tracked</span>
            <strong>{totalApplications}</strong>
          </div>

          <div>
            <span>Fields autofilled</span>
            <strong>
              {Number(
                metrics?.once_only?.fields_autofilled || 0,
              )}
            </strong>
          </div>

          <div>
            <span>Citizen-typed fields</span>
            <strong>
              {Number(
                metrics?.once_only?.citizen_typed || 0,
              )}
            </strong>
          </div>

          <div>
            <span>Autofill rate</span>
            <strong>{autofillPercent}%</strong>
          </div>

          <div>
            <span>Onboarding sessions</span>
            <strong>
              {Number(
                metrics?.onboarding?.sessions || 0,
              )}
            </strong>
          </div>

          <div>
            <span>Median onboarding time</span>
            <strong>
              {Number(
                metrics?.onboarding?.median_seconds || 0,
              )}
              s
            </strong>
          </div>

          <div>
            <span>Latest onboarding time</span>
            <strong>
              {Number(
                metrics?.onboarding?.last_seconds || 0,
              )}
              s
            </strong>
          </div>

          <div>
            <span>Documents not uploaded</span>
            <strong>
              {Number(
                metrics?.once_only?.documents_not_uploaded || 0,
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Administration</h2>
            <p>
              Open the live administration surfaces provided by SETU.
            </p>
          </div>
        </div>

        <div className="setu-admin-actions">
          <button
            type="button"
            onClick={() => navigate('/admin/systems')}
          >
            <strong>Manage Systems</strong>
            <span>
              Inspect live system health and simulate outages.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/studio')}
          >
            <strong>Onboarding Studio</strong>
            <span>
              Configure connector onboarding workflow.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/journeys')}
          >
            <strong>Journey Management</strong>
            <span>
              Inspect configured citizen service journeys.
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/audit')}
          >
            <strong>Access Log</strong>
            <span>
              Review live system and user activity.
            </span>
          </button>
        </div>
      </section>

      <footer className="setu-page-footer">
        Live operational data — SETU prototype
      </footer>
    </main>
  )
}

export default AdminDashboard
