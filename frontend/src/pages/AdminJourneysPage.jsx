import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminJourneysPage() {
  const [journeys, setJourneys] = useState([])
  const [selectedJourney, setSelectedJourney] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadJourneys() {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/journeys')
      setJourneys(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load journeys')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadJourneys()
  }, [])

  const activeCount = journeys.filter(
    (journey) => journey.status === 'ACTIVE',
  ).length

  const configuredSteps = journeys.reduce(
    (total, journey) =>
      total +
      (journey.steps || []).filter(
        (step) => step.configured,
      ).length,
    0,
  )

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Journey Management
          </span>
          <h1>Journey Management</h1>
          <p>
            Review live citizen service journeys and connector
            configuration.
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
          <span>Total Journeys</span>
          <strong>{loading ? '...' : journeys.length}</strong>
          <small>Loaded from the journey store</small>
        </article>

        <article className="setu-stat-card">
          <span>Active</span>
          <strong>{loading ? '...' : activeCount}</strong>
          <small>Active journey definitions</small>
        </article>

        <article className="setu-stat-card">
          <span>Configured Steps</span>
          <strong>
            {loading ? '...' : configuredSteps}
          </strong>
          <small>Steps ready for execution</small>
        </article>

        <article className="setu-stat-card">
          <span>Versions</span>
          <strong>
            {loading
              ? '...'
              : new Set(
                  journeys.map((journey) => journey.version),
                ).size}
          </strong>
          <small>Versions represented</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Service Journeys</h2>
            <p>
              Backend-backed journey definitions and their configured
              steps.
            </p>
          </div>

          <button
            className="setu-secondary-button"
            type="button"
            onClick={loadJourneys}
            disabled={loading}
          >
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>

        <div className="setu-table-wrap">
          <table className="setu-table">
            <thead>
              <tr>
                <th>Journey</th>
                <th>Version</th>
                <th>Steps</th>
                <th>Configured</th>
                <th>Status</th>
                <th>View</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading journeys...</td>
                </tr>
              ) : journeys.length === 0 ? (
                <tr>
                  <td colSpan="6">No journeys found.</td>
                </tr>
              ) : (
                journeys.map((journey) => {
                  const steps = journey.steps || []
                  const configured = steps.filter(
                    (step) => step.configured,
                  ).length

                  return (
                    <tr key={`${journey.id}-${journey.version}`}>
                      <td>
                        <strong>{journey.name}</strong>
                        <small>{journey.id}</small>
                      </td>
                      <td>v{journey.version}</td>
                      <td>{steps.length}</td>
                      <td>
                        {configured} / {steps.length}
                      </td>
                      <td>
                        <span className="setu-status success">
                          {journey.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="setu-secondary-button"
                          type="button"
                          onClick={() =>
                            setSelectedJourney(journey)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedJourney && (
        <section className="setu-content-card">
          <div className="setu-card-heading">
            <div>
              <h2>{selectedJourney.name}</h2>
              <p>
                {selectedJourney.id} · v
                {selectedJourney.version}
              </p>
            </div>

            <button
              className="setu-secondary-button"
              type="button"
              onClick={() => setSelectedJourney(null)}
            >
              Close
            </button>
          </div>

          <div className="setu-journey-steps">
            <h3>Workflow</h3>

            <div className="setu-journey-step-list">
              {(selectedJourney.steps || []).map(
                (step, index) => (
                  <div key={step.id || index}>
                    <span>{index + 1}</span>
                    <strong>{step.id}</strong>
                    <small>
                      {step.type}
                      {step.connector
                        ? ` · ${step.connector}`
                        : ''}
                      {step.entity
                        ? ` · ${step.entity}`
                        : ''}
                      {step.configured
                        ? ' · configured'
                        : ' · not configured'}
                    </small>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="setu-page-footer">
        Live journey definitions — SETU prototype
      </footer>
    </main>
  )
}

export default AdminJourneysPage
