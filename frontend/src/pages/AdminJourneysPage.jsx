import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client.js'

const JOURNEY_STATUS_LABELS = {
  ACTIVE: 'Active',
  DRAFT: 'Draft',
  INACTIVE: 'Inactive',
}

const STEP_TYPE_LABELS = {
  fetch: 'Information check',
  decision: 'Eligibility decision',
  submit: 'Submit application',
  notify: 'Notification',
  wait: 'Waiting stage',
}

const STEP_TITLE_LABELS = {
  fetch_income: 'Verify income',
  fetch_enrolment: 'Verify education record',
  fetch_training: 'Verify training record',
  evaluate_eligibility: 'Check eligibility',
  submit_bss: 'Submit application',
  await_decision: 'Wait for officer decision',
}

const ENTITY_LABELS = {
  income_certificate: 'Income information',
  enrolment: 'Education record',
  training_record: 'Training record',
}

const CONNECTOR_LABELS = {
  rev_income: 'Revenue Department',
  edu_enrolment: 'Education Department',
  bss_scholarship: 'Benefit service',
  skl_training: 'Skills & Employment Registry',
}

function humanizeToken(value) {
  if (value == null || value === '') {
    return '—'
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function journeyStatusLabel(value) {
  return (
    JOURNEY_STATUS_LABELS[value] ||
    humanizeToken(value)
  )
}

function stepTypeLabel(value) {
  return (
    STEP_TYPE_LABELS[value] ||
    humanizeToken(value)
  )
}

function stepTitleLabel(value, entity) {
  if (STEP_TITLE_LABELS[value]) {
    return STEP_TITLE_LABELS[value]
  }

  if (entity && ENTITY_LABELS[entity]) {
    return `Check ${ENTITY_LABELS[entity].toLowerCase()}`
  }

  return humanizeToken(value)
}

function entityLabel(value) {
  return ENTITY_LABELS[value] || humanizeToken(value)
}

function connectorLabel(value) {
  return (
    CONNECTOR_LABELS[value] ||
    humanizeToken(value)
  )
}

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
      if (
        current &&
        normalized.some(
          (journey) => journey.id === current,
        )
      ) {
        return current
      }

      return normalized[0]?.id || ''
    })
  }

  useEffect(() => {
    let cancelled = false

    apiRequest('/api/journeys')
      .then((data) => {
        if (cancelled) {
          return
        }

        const normalized = Array.isArray(data)
          ? data
          : []

        setJourneys(normalized)
        setSelectedId(normalized[0]?.id || '')
      })
      .catch((err) => {
        if (cancelled) {
          return
        }

        setError(
          err.message ||
            'Unable to load service journeys.',
        )
      })
      .finally(() => {
        if (cancelled) {
          return
        }

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
      setError(
        err.message ||
          'Unable to refresh service journeys.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  const filteredJourneys = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return journeys
    }

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
    journeys.find(
      (journey) => journey.id === selectedId,
    ) ||
    filteredJourneys[0] ||
    null

  const activeJourneys = journeys.filter(
    (journey) =>
      String(journey.status || '').toUpperCase() ===
      'ACTIVE',
  ).length

  const configuredSteps = journeys.reduce(
    (total, journey) =>
      total +
      (Array.isArray(journey.steps)
        ? journey.steps.filter(
            (step) => step.configured,
          ).length
        : 0),
    0,
  )

  const totalSteps = journeys.reduce(
    (total, journey) =>
      total +
      (Array.isArray(journey.steps)
        ? journey.steps.length
        : 0),
    0,
  )

  return (
    <main className="setu-dashboard-page setu-journey-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Admin / Journey Management
          </div>

          <h1>Service Journeys</h1>

          <p>
            Review how citizen services move through
            connected government systems.
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
          <p className="setu-error-message">
            {error}
          </p>
        </section>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Service journeys</span>
          <strong>{journeys.length}</strong>
          <small>Available in the live registry</small>
        </article>

        <article className="setu-stat-card">
          <span>Active journeys</span>
          <strong>{activeJourneys}</strong>
          <small>Currently available for use</small>
        </article>

        <article className="setu-stat-card">
          <span>Service stages</span>
          <strong>{totalSteps}</strong>
          <small>Across the configured journeys</small>
        </article>

        <article className="setu-stat-card">
          <span>Ready stages</span>
          <strong>{configuredSteps}</strong>
          <small>Configured for execution</small>
        </article>
      </section>

      <section className="setu-journey-config">
        <div className="setu-journey-config-header">
          <div>
            <h2>Available services</h2>

            <p>
              Select a service to review its processing
              stages and connected information sources.
            </p>
          </div>

          <input
            className="setu-input"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search services or connected systems..."
            aria-label="Search service journeys"
          />
        </div>

        {loading ? (
          <div className="setu-empty-state">
            Loading service journeys...
          </div>
        ) : filteredJourneys.length === 0 ? (
          <div className="setu-empty-state">
            No service journeys match the current search.
          </div>
        ) : (
          <div className="setu-journey-layout">
            <aside className="setu-journey-step-list">
              {filteredJourneys.map((journey) => {
                const active =
                  journey.id ===
                  selectedJourney?.id

                const steps = Array.isArray(
                  journey.steps,
                )
                  ? journey.steps
                  : []

                return (
                  <button
                    key={journey.id}
                    type="button"
                    className={`setu-journey-item ${
                      active ? 'active' : ''
                    }`}
                    onClick={() =>
                      setSelectedId(journey.id)
                    }
                  >
                    <div className="setu-journey-item-top">
                      <strong>{journey.name}</strong>

                      <span
                        className={`setu-status ${
                          String(
                            journey.status,
                          ).toUpperCase() === 'ACTIVE'
                            ? 'success'
                            : 'pending'
                        }`}
                      >
                        {journeyStatusLabel(
                          journey.status,
                        )}
                      </span>
                    </div>

                    <small>
                      Configuration version{' '}
                      {journey.version} · {steps.length}{' '}
                      stage
                      {steps.length === 1
                        ? ''
                        : 's'}
                    </small>
                  </button>
                )
              })}
            </aside>

            <section className="setu-journey-detail">
              {!selectedJourney ? (
                <div className="setu-empty-state">
                  Select a service to inspect its journey.
                </div>
              ) : (
                <>
                  <div className="setu-section-heading">
                    <div>
                      <span className="setu-kicker">
                        Service journey
                      </span>

                      <h2>
                        {selectedJourney.name}
                      </h2>

                      <p>
                        Configuration version{' '}
                        {selectedJourney.version}
                      </p>
                    </div>

                    <span
                      className={`setu-status ${
                        String(
                          selectedJourney.status,
                        ).toUpperCase() === 'ACTIVE'
                          ? 'success'
                          : 'pending'
                      }`}
                    >
                      {journeyStatusLabel(
                        selectedJourney.status,
                      )}
                    </span>
                  </div>

                  <div className="setu-journey-summary">
                    <div>
                      <span>
                        Configuration version
                      </span>

                      <strong>
                        {selectedJourney.version}
                      </strong>
                    </div>

                    <div>
                      <span>Service stages</span>

                      <strong>
                        {Array.isArray(
                          selectedJourney.steps,
                        )
                          ? selectedJourney.steps.length
                          : 0}
                      </strong>
                    </div>

                    <div>
                      <span>Ready stages</span>

                      <strong>
                        {Array.isArray(
                          selectedJourney.steps,
                        )
                          ? selectedJourney.steps.filter(
                              (step) =>
                                step.configured,
                            ).length
                          : 0}
                      </strong>
                    </div>
                  </div>

                  <div className="setu-journey-steps">
                    {Array.isArray(
                      selectedJourney.steps,
                    ) &&
                    selectedJourney.steps.length > 0 ? (
                      selectedJourney.steps.map(
                        (step, index) => (
                          <article
                            className="setu-journey-step"
                            key={
                              step.id ||
                              `${selectedJourney.id}-${index}`
                            }
                          >
                            <div className="setu-journey-step-number">
                              {index + 1}
                            </div>

                            <div className="setu-journey-step-content">
                              <div className="setu-journey-step-heading">
                                <div>
                                  <span className="setu-kicker">
                                    {stepTypeLabel(
                                      step.type,
                                    )}
                                  </span>

                                  <h3>
                                    {stepTitleLabel(
                                      step.id,
                                      step.entity,
                                    )}
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
                                    ? 'Ready'
                                    : 'Needs configuration'}
                                </span>
                              </div>

                              <div className="setu-journey-step-meta">
                                {step.entity && (
                                  <div>
                                    <span>
                                      Information used
                                    </span>

                                    <strong>
                                      {entityLabel(
                                        step.entity,
                                      )}
                                    </strong>
                                  </div>
                                )}

                                {step.connector && (
                                  <div>
                                    <span>
                                      Connected system
                                    </span>

                                    <strong>
                                      {connectorLabel(
                                        step.connector,
                                      )}
                                    </strong>
                                  </div>
                                )}
                              </div>

                              <details className="setu-journey-technical-details">
                                <summary>
                                  Technical configuration
                                </summary>

                                <div className="setu-journey-technical-grid">
                                  <div>
                                    <span>Step ID</span>
                                    <strong>
                                      {step.id || '—'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>Step type</span>
                                    <strong>
                                      {step.type || '—'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>Connector ID</span>
                                    <strong>
                                      {step.connector || '—'}
                                    </strong>
                                  </div>

                                  <div>
                                    <span>Entity key</span>
                                    <strong>
                                      {step.entity || '—'}
                                    </strong>
                                  </div>
                                </div>
                              </details>
                            </div>
                          </article>
                        ),
                      )
                    ) : (
                      <div className="setu-empty-state">
                        This service currently has no
                        configured stages.
                      </div>
                    )}
                  </div>

                  <div className="setu-info-banner">
                    <strong>
                      Read-only service configuration
                    </strong>

                    <span>
                      This view reflects the live service
                      registry. The current backend does
                      not expose journey creation or
                      modification controls.
                    </span>
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </section>

      <footer className="setu-page-footer">
        Live service registry · MAHA SETU prototype
      </footer>
    </main>
  )
}

export default AdminJourneysPage
