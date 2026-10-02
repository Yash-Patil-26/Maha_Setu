import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

const SERVICE_LABELS = {
  scholarship_v1: 'Post-Matric Scholarship',
  youth_enterprise_v1: 'Youth Enterprise Support',
}

const PURPOSE_LABELS = {
  scholarship_eligibility:
    'Eligibility information',
  youth_enterprise_eligibility:
    'Eligibility information',
}

const SYSTEM_LABELS = {
  REV: 'Revenue Department',
  EDU: 'Education Department',
  BSS: 'Benefit service',
  SKL: 'Skills & Employment Registry',
}

const FIELD_LABELS = {
  annual_income_inr: 'Annual income',
  cert_no: 'Certificate number',
  course_code: 'Course',
  dob: 'Date of birth',
  enrolment_id: 'Enrolment ID',
  holder_name: 'Certificate holder',
  institution_code: 'Institution',
  issue_date: 'Issue date',
  issuing_authority: 'Issuing authority',
  last_updated: 'Last updated',
  status: 'Record status',
  student_name: 'Student name',
  valid_until: 'Valid until',
  year_of_study: 'Year of study',
}

const OUTCOME_LABELS = {
  ALLOWED: 'Access allowed',
  DENIED: 'Access denied',
  ERROR: 'Access could not be completed',
}

function labelize(value) {
  if (!value) {
    return '—'
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function serviceLabel(value) {
  return (
    SERVICE_LABELS[value] ||
    labelize(value)
  )
}

function purposeLabel(value) {
  return (
    PURPOSE_LABELS[value] ||
    labelize(value)
  )
}

function systemLabel(value) {
  return (
    SYSTEM_LABELS[value] ||
    labelize(value)
  )
}

function fieldLabel(value) {
  return (
    FIELD_LABELS[value] ||
    labelize(value)
  )
}

function outcomeLabel(value) {
  return (
    OUTCOME_LABELS[value] ||
    labelize(value)
  )
}

function statusLabel(value) {
  const labels = {
    ACTIVE: 'Active',
    REVOKED: 'Stopped',
    EXPIRED: 'Expired',
  }

  return labels[value] || labelize(value)
}

function statusClass(status) {
  return String(status || '').toLowerCase()
}

function formatDate(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date)
}

export default function CitizenConsentPage() {
  const [consents, setConsents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyConsentId, setBusyConsentId] =
    useState(null)
  const [expandedConsentId, setExpandedConsentId] =
    useState(null)
  const [accessLogs, setAccessLogs] = useState({})
  const [accessLoadingId, setAccessLoadingId] =
    useState(null)
  const [accessErrors, setAccessErrors] = useState({})

  const loadConsents = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/consents')
      setConsents(
        Array.isArray(result) ? result : [],
      )
    } catch (err) {
      setError(
        err.message ||
          'Unable to load your permissions.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConsents()
  }, [loadConsents])

  async function handleRevoke(consent) {
    const confirmed = window.confirm(
      `Stop sharing information for "${serviceLabel(consent.journey_id)}"? You can grant permission again when you next apply.`,
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
          item.id === consent.id
            ? updated
            : item,
        ),
      )

      setExpandedConsentId(null)
    } catch (err) {
      setError(
        err.message ||
          'Unable to stop sharing this information.',
      )
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
        [consent.id]: Array.isArray(result)
          ? result
          : [],
      }))
    } catch (err) {
      setAccessErrors((current) => ({
        ...current,
        [consent.id]:
          err.message ||
          'Unable to load access history.',
      }))
    } finally {
      setAccessLoadingId(null)
    }
  }

  return (
    <main className="setu-consent-page">
      <div className="setu-flow-breadcrumb">
        <Link to="/citizen">Citizen Dashboard</Link>
        <span aria-hidden="true">&gt;</span>
        <span>Consent &amp; Data</span>
      </div>

      <header className="setu-flow-header">
        <div>
          <p className="setu-flow-eyebrow">
            Privacy &amp; control
          </p>

          <h1>Consent &amp; Data</h1>

          <p>
            Review the information you have allowed MAHA SETU
            to use, where it comes from, and when it was accessed.
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/citizen"
        >
          Back to dashboard
        </Link>
      </header>

      {error && (
        <p className="form-error setu-flow-error-message" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="setu-flow-card">
          <p aria-live="polite">
            Loading your permissions…
          </p>
        </section>
      ) : consents.length === 0 ? (
        <section className="setu-flow-card setu-consent-empty">
          <p className="setu-flow-eyebrow">
            Your permissions
          </p>

          <h2>No active permissions</h2>

          <p>
            You have not allowed any service to use
            connected government information yet.
          </p>

          <Link
            className="button"
            to="/citizen"
          >
            Browse services
          </Link>
        </section>
      ) : (
        <section
          className="setu-consent-list"
          aria-label="Your data-sharing permissions"
        >
          {consents.map((consent) => {
            const logs =
              accessLogs[consent.id] || []

            const accessError =
              accessErrors[consent.id]

            const isExpanded =
              expandedConsentId === consent.id

            const isActive =
              consent.status === 'ACTIVE'

            return (
              <article
                className="setu-flow-card setu-consent-card"
                key={consent.id}
              >
                <div className="setu-consent-card-header">
                  <div>
                    <p className="setu-flow-eyebrow">
                      Service permission
                    </p>

                    <h2>
                      {serviceLabel(
                        consent.journey_id,
                      )}
                    </h2>

                    <p>
                      Allows MAHA SETU to use information
                      needed for{' '}
                      {purposeLabel(consent.purpose).toLowerCase()}.
                    </p>
                  </div>

                  <span
                    className={`status-badge consent-status ${statusClass(
                      consent.status,
                    )}`}
                  >
                    {statusLabel(consent.status)}
                  </span>
                </div>

                <div className="setu-consent-meta">
                  <div>
                    <span>Permission started</span>
                    <strong>
                      {formatDate(
                        consent.granted_at,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Valid until</span>
                    <strong>
                      {formatDate(
                        consent.expires_at,
                      )}
                    </strong>
                  </div>

                  {consent.revoked_at && (
                    <div>
                      <span>Stopped</span>
                      <strong>
                        {formatDate(
                          consent.revoked_at,
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="setu-consent-section">
                  <h3>Information sources</h3>

                  <div className="setu-consent-chip-list">
                    {consent.source_systems.map(
                      (system) => (
                        <span
                          className="setu-flow-source-chip"
                          key={system}
                        >
                          {systemLabel(system)}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="setu-consent-section">
                  <h3>Information that may be used</h3>

                  <div className="setu-consent-field-list">
                    {consent.fields.map(
                      (field) => (
                        <span key={field}>
                          {fieldLabel(field)}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="setu-consent-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() =>
                      toggleAccessLog(consent)
                    }
                    disabled={
                      accessLoadingId ===
                      consent.id
                    }
                  >
                    {accessLoadingId ===
                    consent.id
                      ? 'Loading access history…'
                      : isExpanded
                        ? 'Hide access history'
                        : 'View access history'}
                  </button>

                  {isActive && (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() =>
                        handleRevoke(consent)
                      }
                      disabled={
                        busyConsentId ===
                        consent.id
                      }
                    >
                      {busyConsentId ===
                      consent.id
                        ? 'Stopping…'
                        : 'Stop sharing this information'}
                    </button>
                  )}
                </div>

                {isExpanded && (
                  <div className="setu-consent-access-panel">
                    <div>
                      <p className="setu-flow-eyebrow">
                        Transparency
                      </p>

                      <h3>Access history</h3>

                      <p>
                        See when connected services accessed
                        information for this permission.
                      </p>
                    </div>

                    {accessError && (
                      <p
                        className="form-error"
                        role="alert"
                      >
                        {accessError}
                      </p>
                    )}

                    {!accessError &&
                      logs.length === 0 && (
                        <p className="setu-consent-note">
                          No access has been recorded yet.
                        </p>
                      )}

                    {logs.length > 0 && (
                      <div className="setu-access-log-list">
                        {logs.map((log) => (
                          <article
                            className="setu-access-log-item"
                            key={log.id}
                          >
                            <div>
                              <strong>
                                {systemLabel(
                                  log.system_code,
                                )}
                              </strong>

                              <span>
                                {outcomeLabel(
                                  log.outcome,
                                )}
                              </span>
                            </div>

                            <small>
                              {formatDate(log.at)}
                            </small>

                            <p>
                              Information used:{' '}
                              {log.fields?.length
                                ? log.fields
                                    .map(fieldLabel)
                                    .join(', ')
                                : 'None'}
                            </p>

                            {log.application_id && (
                              <small>
                                Application APP-{String(log.application_id).padStart(6, '0')}
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
    </main>
  )
}
