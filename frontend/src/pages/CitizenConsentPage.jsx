import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function labelize(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusClass(status) {
  return String(status || '').toLowerCase()
}

export default function CitizenConsentPage() {
  const [consents, setConsents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyConsentId, setBusyConsentId] = useState(null)
  const [expandedConsentId, setExpandedConsentId] = useState(null)
  const [accessLogs, setAccessLogs] = useState({})
  const [accessLoadingId, setAccessLoadingId] = useState(null)
  const [accessErrors, setAccessErrors] = useState({})

  async function loadConsents() {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/consents')
      setConsents(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Unable to load consent records.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConsents()
  }, [])

  async function handleRevoke(consent) {
    const confirmed = window.confirm(
      `Revoke data-sharing consent for "${labelize(consent.purpose)}"?`,
    )

    if (!confirmed) {
      return
    }

    setBusyConsentId(consent.id)
    setError('')

    try {
      const updated = await apiRequest(
        `/api/consents/${consent.id}/revoke`,
        {
          method: 'POST',
        },
      )

      setConsents((current) =>
        current.map((item) =>
          item.id === consent.id ? updated : item,
        ),
      )

      setExpandedConsentId(null)
    } catch (err) {
      setError(err.message || 'Unable to revoke consent.')
    } finally {
      setBusyConsentId(null)
    }
  }

  async function toggleAccessLog(consent) {
    if (expandedConsentId === consent.id) {
      setExpandedConsentId(null)
      return
    }

    setExpandedConsentId(consent.id)

    if (accessLogs[consent.id]) {
      return
    }

    setAccessLoadingId(consent.id)
    setAccessErrors((current) => ({
      ...current,
      [consent.id]: '',
    }))

    try {
      const result = await apiRequest(
        `/api/consents/${consent.id}/access-log`,
      )

      setAccessLogs((current) => ({
        ...current,
        [consent.id]: Array.isArray(result) ? result : [],
      }))
    } catch (err) {
      setAccessErrors((current) => ({
        ...current,
        [consent.id]:
          err.message || 'Unable to load access history.',
      }))
    } finally {
      setAccessLoadingId(null)
    }
  }

  return (
    <main>
      <header className="page-header">
        <p>Citizen Dashboard / Privacy</p>
        <div className="dashboard-header">
          <div>
            <h1>My Consents</h1>
            <p>
              Review and manage the data-sharing permissions you have
              granted to SETU.
            </p>
          </div>

          <Link className="consent-back-link" to="/citizen">
            Back to dashboard
          </Link>
        </div>
      </header>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="card consent-empty-state">
          <p>Loading your consent records…</p>
        </section>
      ) : consents.length === 0 ? (
        <section className="card consent-empty-state">
          <h2>No consent records</h2>
          <p>
            You have not granted any data-sharing permissions yet.
          </p>
          <Link to="/citizen">Browse available services</Link>
        </section>
      ) : (
        <section
          className="consent-list"
          aria-label="Consent records"
        >
          {consents.map((consent) => {
            const logs = accessLogs[consent.id] || []
            const accessError = accessErrors[consent.id]
            const isExpanded = expandedConsentId === consent.id
            const isActive = consent.status === 'ACTIVE'

            return (
              <article
                className="card consent-card"
                key={consent.id}
              >
                <div className="consent-card-header">
                  <div>
                    <p className="consent-eyebrow">
                      {labelize(consent.journey_id)}
                    </p>
                    <h2>{labelize(consent.purpose)}</h2>
                  </div>

                  <span
                    className={`status-badge consent-status ${statusClass(
                      consent.status,
                    )}`}
                  >
                    {consent.status}
                  </span>
                </div>

                <div className="consent-meta-grid">
                  <div>
                    <span>Granted</span>
                    <strong>
                      {formatDate(consent.granted_at)}
                    </strong>
                  </div>

                  <div>
                    <span>Expires</span>
                    <strong>
                      {formatDate(consent.expires_at)}
                    </strong>
                  </div>

                  {consent.revoked_at && (
                    <div>
                      <span>Revoked</span>
                      <strong>
                        {formatDate(consent.revoked_at)}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="consent-section">
                  <h3>Source systems</h3>
                  <div className="consent-chip-list">
                    {consent.source_systems.map((system) => (
                      <span
                        className="consent-chip"
                        key={system}
                      >
                        {system}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="consent-section">
                  <h3>Permitted fields</h3>
                  <div className="consent-field-list">
                    {consent.fields.map((field) => (
                      <span key={field}>{labelize(field)}</span>
                    ))}
                  </div>
                </div>

                <div className="consent-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => toggleAccessLog(consent)}
                    disabled={accessLoadingId === consent.id}
                  >
                    {accessLoadingId === consent.id
                      ? 'Loading access history…'
                      : isExpanded
                        ? 'Hide access history'
                        : 'View access history'}
                  </button>

                  {isActive && (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleRevoke(consent)}
                      disabled={busyConsentId === consent.id}
                    >
                      {busyConsentId === consent.id
                        ? 'Revoking…'
                        : 'Revoke consent'}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="consent-access-panel">
                    <div>
                      <h3>Access history</h3>
                      <p>
                        Records of SETU accessing data for this
                        consent purpose.
                      </p>
                    </div>

                    {accessError && (
                      <p className="form-error" role="alert">
                        {accessError}
                      </p>
                    )}

                    {!accessError && logs.length === 0 && (
                      <p>No access has been recorded yet.</p>
                    )}

                    {logs.length > 0 && (
                      <div className="access-log-list">
                        {logs.map((log) => (
                          <article
                            className="access-log-item"
                            key={log.id}
                          >
                            <div>
                              <strong>
                                {log.system_code}
                              </strong>
                              <span>
                                {log.outcome}
                              </span>
                            </div>

                            <small>
                              {formatDate(log.at)}
                            </small>

                            <p>
                              Fields:{' '}
                              {log.fields.length > 0
                                ? log.fields
                                    .map(labelize)
                                    .join(', ')
                                : 'None'}
                            </p>

                            {log.application_id && (
                              <small>
                                Application {log.application_id}
                              </small>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </section>
      )}

      <footer className="page-footer">
        Consent records are stored by SETU and scoped to your
        authenticated identity.
      </footer>
    </main>
  )
}
