import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminJourneysPage() {
  const [journeys, setJourneys] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  async function loadJourneys() {
    const data = await apiRequest('/api/journeys')
    const normalized = Array.isArray(data) ? data : []

    setJourneys(normalized)

    setSelectedId((current) => {
      if (current && normalized.some((journey) => journey.id === current)) {
        return current
      }

      return normalized[0]?.id || ''
    })
  }

  useEffect(() => {
    let cancelled = false

    apiRequest('/api/journeys')
      .then((data) => {
        if (cancelled) return

        const normalized = Array.isArray(data) ? data : []

        setJourneys(normalized)
        setSelectedId(normalized[0]?.id || '')
      })
      .catch((err) => {
        if (cancelled) return

        setError(err.message || 'Failed to load journeys')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    setError('')

    try {
      await loadJourneys()
    } catch (err) {
      setError(err.message || 'Failed to refresh journeys')
    } finally {
      setRefreshing(false)
    }
  }

  const filteredJourneys = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return journeys

    return journeys.filter((journey) => {
      const haystack = [
        journey.id,
        journey.name,
        journey.status,
        journey.version,
        ...(Array.isArray(journey.steps)
          ? journey.steps.flatMap((step) => [
              step.id,
              step.type,
              step.connector,
              step.entity,
            ])
          : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [journeys, search])

  const selectedJourney =
    journeys.find((journey) => journey.id === selectedId) ||
    filteredJourneys[0] ||
    null

  const activeJourneys = journeys.filter(
    (journey) =>
      String(journey.status || '').toUpperCase() === 'ACTIVE',
  ).length

  const configuredSteps = journeys.reduce(
    (total, journey) =>
      total +
      (Array.isArray(journey.steps)
        ? journey.steps.filter((step) => step.configured).length
        : 0),
    0,
  )

  const totalSteps = journeys.reduce(
    (total, journey) =>
      total +
      (Array.isArray(journey.steps) ? journey.steps.length : 0),
    0,
  )

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Admin / Journey Management
          </div>

          <h1>Journey Management</h1>

          <p>
            Inspect the live citizen-service journeys that orchestrate
            interoperability across connected government systems.
          </p>
        </div>

        <button
          className="setu-secondary-button"
          type="button"
          onClick={handleRefresh}
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
          <span>Total Journeys</span>
          <strong>{journeys.length}</strong>
          <small>Live journey registry</small>
        </article>

        <article className="setu-stat-card">
          <span>Active Journeys</span>
          <strong>{activeJourneys}</strong>
          <small>Currently active</small>
        </article>

        <article className="setu-stat-card">
          <span>Processing Steps</span>
          <strong>{totalSteps}</strong>
          <small>Across configured journeys</small>
        </article>

        <article className="setu-stat-card">
          <span>Configured Steps</span>
          <strong>{configuredSteps}</strong>
          <small>Ready for execution</small>
        </article>
      </section>

      <section className="setu-journey-config">
        <div className="setu-journey-config-header">
          <div>
            <h2>Service Journeys</h2>
            <p>
              Select a journey to inspect its orchestration path and
              connector dependencies.
            </p>
          </div>

          <input
            className="setu-input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search journeys, connectors or entities..."
            aria-label="Search journeys"
          />
        </div>

        {loading ? (
          <div className="setu-empty-state">
            Loading journey registry...
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="setu-empty-state">
            No journeys match the current search.
          </div>
        ) : (
          <div className="setu-journey-layout">
            <aside className="setu-journey-step-list">
              {filteredJourneys.map((journey) => {
                const active =
                  journey.id === selectedJourney?.id

                const steps = Array.isArray(journey.steps)
                  ? journey.steps
                  : []

                return (
                  <button
                    key={journey.id}
                    type="button"
                    className={`setu-journey-item ${
                      active ? 'active' : ''
                    }`}
                    onClick={() => setSelectedId(journey.id)}
                  >
                    <div className="setu-journey-item-top">
                      <strong>{journey.name}</strong>

                      <span
                        className={`setu-status ${
                          String(journey.status).toUpperCase() ===
                          'ACTIVE'
                            ? 'success'
                            : 'pending'
                        }`}
                      >
                        {journey.status}
                      </span>
                    </div>

                    <small>
                      v{journey.version} · {steps.length} step
                      {steps.length === 1 ? '' : 's'}
                    </small>

                    <span className="setu-journey-item-id">
                      {journey.id}
                    </span>
                  </button>
                )
              })}
            </aside>

            <section className="setu-journey-detail">
              {!selectedJourney ? (
                <div className="setu-empty-state">
                  Select a journey to inspect its configuration.
                </div>
              ) : (
                <>
                  <div className="setu-section-heading">
                    <div>
                      <span className="setu-kicker">
                        {selectedJourney.id}
                      </span>

                      <h2>{selectedJourney.name}</h2>

                      <p>
                        Journey version {selectedJourney.version}
                      </p>
                    </div>

                    <span
                      className={`setu-status ${
                        String(selectedJourney.status).toUpperCase() ===
                        'ACTIVE'
                          ? 'success'
                          : 'pending'
                      }`}
                    >
                      {selectedJourney.status}
                    </span>
                  </div>

                  <div className="setu-journey-summary">
                    <div>
                      <span>Version</span>
                      <strong>
                        {selectedJourney.version}
                      </strong>
                    </div>

                    <div>
                      <span>Steps</span>
                      <strong>
                        {Array.isArray(selectedJourney.steps)
                          ? selectedJourney.steps.length
                          : 0}
                      </strong>
                    </div>

                    <div>
                      <span>Configured</span>
                      <strong>
                        {Array.isArray(selectedJourney.steps)
                          ? selectedJourney.steps.filter(
                              (step) => step.configured,
                            ).length
                          : 0}
                      </strong>
                    </div>
                  </div>

                  <div className="setu-journey-steps">
                    {Array.isArray(selectedJourney.steps) &&
                    selectedJourney.steps.length > 0 ? (
                      selectedJourney.steps.map((step, index) => (
                        <article
                          className="setu-journey-step"
                          key={step.id || `${selectedJourney.id}-${index}`}
                        >
                          <div className="setu-journey-step-number">
                            {index + 1}
                          </div>

                          <div className="setu-journey-step-content">
                            <div className="setu-journey-step-heading">
                              <div>
                                <span className="setu-kicker">
                                  {step.type || 'PROCESSING STEP'}
                                </span>

                                <h3>
                                  {step.entity ||
                                    step.id ||
                                    'Untitled step'}
                                </h3>
                              </div>

                              <span
                                className={`setu-status ${
                                  step.configured
                                    ? 'success'
                                    : 'pending'
                                }`}
                              >
                                {step.configured
                                  ? 'Configured'
                                  : 'Needs configuration'}
                              </span>
                            </div>

                            <div className="setu-journey-step-meta">
                              <div>
                                <span>Connector</span>
                                <strong>
                                  {step.connector || 'Not specified'}
                                </strong>
                              </div>

                              <div>
                                <span>Step ID</span>
                                <strong>
                                  {step.id || 'Not specified'}
                                </strong>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="setu-empty-state">
                        This journey currently has no configured steps.
                      </div>
                    )}
                  </div>

                  <div className="setu-info-banner">
                    <strong>Read-only configuration view</strong>
                    <span>
                      Journey creation and modification are not exposed by
                      the current SETU backend contract. This screen therefore
                      reflects the live registry without presenting
                      unsupported controls.
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </section>

      <footer className="setu-page-footer">
        Live journey registry — SETU prototype
      </footer>
    </main>
  )
}

export default AdminJourneysPage
