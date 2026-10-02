import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

export default function AdminMetricsPage() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/metrics/summary')
      .then((result) => setMetrics(result || {}))
      .catch((err) => {
        setError(err.message || 'Unable to load metrics.')
      })
      .finally(() => setLoading(false))
  }, [])

  const onceOnly = metrics?.once_only || {}
  const onboarding = metrics?.onboarding || {}

  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Admin / Metrics
          </span>
          <h1>Metrics</h1>
          <p>
            Monitor service integration and once-only information reuse.
          </p>
        </div>
      </div>

      {loading ? (
        <section className="setu-content-card">
          <p aria-live="polite">Loading metrics...</p>
        </section>
      ) : error ? (
        <section className="setu-content-card">
          <p className="form-error" role="alert">{error}</p>
        </section>
      ) : (
        <section className="setu-stat-grid">
          <article className="setu-stat-card">
            <span>Applications tracked</span>
            <strong>{Number(onceOnly.applications || 0)}</strong>
            <small>Recorded applications</small>
          </article>

          <article className="setu-stat-card">
            <span>Fields autofilled</span>
            <strong>{Number(onceOnly.fields_autofilled || 0)}</strong>
            <small>Reused connected information</small>
          </article>

          <article className="setu-stat-card">
            <span>Citizen-entered fields</span>
            <strong>{Number(onceOnly.citizen_typed || 0)}</strong>
            <small>Information entered manually</small>
          </article>

          <article className="setu-stat-card">
            <span>Autofill rate</span>
            <strong>{Number(onceOnly.autofill_pct || 0)}%</strong>
            <small>Once-only reuse</small>
          </article>

          <article className="setu-stat-card">
            <span>Onboarding sessions</span>
            <strong>{Number(onboarding.sessions || 0)}</strong>
            <small>Connector onboarding activity</small>
          </article>

          <article className="setu-stat-card">
            <span>Median onboarding time</span>
            <strong>
              {Number.isFinite(Number(onboarding.median_seconds))
                ? `${Math.round(Number(onboarding.median_seconds))}s`
                : '—'}
            </strong>
            <small>Median setup time</small>
          </article>
        </section>
      )}
    </main>
  )
}
