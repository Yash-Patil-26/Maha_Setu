import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function AdminDashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiRequest('/api/metrics/summary')
      .then((result) => {
        if (active) {
          setMetrics(result)
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load dashboard metrics')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const onceOnly = metrics?.once_only || {}
  const onboarding = metrics?.onboarding || {}

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Admin Dashboard
          </div>
          <h1>Admin Dashboard</h1>
          <p>
            Manage connected systems, service journeys and SETU
            interoperability.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Applications</span>
          <strong>
            {loading ? '...' : onceOnly.applications ?? 0}
          </strong>
          <small>Processed applications</small>
        </article>

        <article className="setu-stat-card">
          <span>Autofill Rate</span>
          <strong>
            {loading ? '...' : `${onceOnly.autofill_pct ?? 0}%`}
          </strong>
          <small>Fields populated automatically</small>
        </article>

        <article className="setu-stat-card">
          <span>Onboarding Sessions</span>
          <strong>
            {loading ? '...' : onboarding.sessions ?? 0}
          </strong>
          <small>Completed connector sessions</small>
        </article>

        <article className="setu-stat-card">
          <span>Last Onboarding</span>
          <strong>
            {loading ? '...' : `${onboarding.last_seconds ?? 0}s`}
          </strong>
          <small>Most recent connector session</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Once-Only Metrics</h2>
            <p>
              Live measurements from the SETU application database.
            </p>
          </div>
        </div>

        <div className="setu-system-grid">
          <article className="setu-system-card">
            <div className="setu-system-icon">FT</div>
            <div className="setu-system-info">
              <h3>Total Fields</h3>
              <p>{onceOnly.fields_total ?? 0} fields observed</p>
            </div>
          </article>

          <article className="setu-system-card">
            <div className="setu-system-icon">AF</div>
            <div className="setu-system-info">
              <h3>Autofilled Fields</h3>
              <p>{onceOnly.fields_autofilled ?? 0} fields populated</p>
            </div>
          </article>

          <article className="setu-system-card">
            <div className="setu-system-icon">CT</div>
            <div className="setu-system-info">
              <h3>Citizen Typed</h3>
              <p>{onceOnly.citizen_typed ?? 0} fields entered</p>
            </div>
          </article>

          <article className="setu-system-card">
            <div className="setu-system-icon">DU</div>
            <div className="setu-system-info">
              <h3>Documents Avoided</h3>
              <p>{onceOnly.documents_not_uploaded ?? 0} uploads avoided</p>
            </div>
          </article>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Common administration tasks.</p>
          </div>
        </div>

        <div className="setu-admin-actions">
          <button
            type="button"
            onClick={() => navigate('/admin/systems')}
          >
            <strong>Manage Systems</strong>
            <span>Review connected government systems</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/studio')}
          >
            <strong>Onboarding Studio</strong>
            <span>Connect and configure a new system</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/journeys')}
          >
            <strong>Journey Management</strong>
            <span>Review live citizen service journeys</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/audit')}
          >
            <strong>Access Log</strong>
            <span>Review consent-based data access</span>
          </button>
        </div>
      </section>

      <footer className="page-footer">
        Live metrics — SETU prototype
      </footer>
    </main>
  )
}

export default AdminDashboard
