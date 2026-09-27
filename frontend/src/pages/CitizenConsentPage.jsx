import { useEffect, useState } from 'react'
import { getAccessToken } from '../auth/storage.js'

const API_BASE_URL = 'http://127.0.0.1:8000'

function CitizenConsentPage() {
  const [consents, setConsents] = useState([])
  const [accessLog, setAccessLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [granting, setGranting] = useState(false)
  const [revokingId, setRevokingId] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function apiFetch(path, options = {}) {
    const token = getAccessToken()

    if (!token) {
      throw new Error('Please log in again.')
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })

    let data = null

    try {
      data = await response.json()
    } catch {
      data = null
    }

    if (!response.ok) {
      throw new Error(
        data?.detail || data?.message || `Request failed (${response.status})`,
      )
    }

    return data
  }

  async function loadData(showSpinner = true) {
    if (showSpinner) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    setError('')

    try {
      const [consentData, logData] = await Promise.all([
        apiFetch('/api/consents'),
        apiFetch('/api/access-log?limit=50&offset=0'),
      ])

      setConsents(Array.isArray(consentData) ? consentData : consentData?.items || [])
      setAccessLog(Array.isArray(logData) ? logData : logData?.items || [])
    } catch (err) {
      setError(err.message || 'Unable to load consent information.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleGrantConsent() {
    setGranting(true)
    setError('')
    setMessage('')

    try {
      await apiFetch('/api/consents', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'scholarship_eligibility',
          journey_id: 'scholarship_v1',
        }),
      })

      setMessage('Consent granted successfully.')
      await loadData(false)
    } catch (err) {
      setError(err.message || 'Unable to grant consent.')
    } finally {
      setGranting(false)
    }
  }

  async function handleRevokeConsent(consentId) {
    setRevokingId(consentId)
    setError('')
    setMessage('')

    try {
      await apiFetch(`/api/consents/${consentId}/revoke`, {
        method: 'POST',
      })

      setMessage(
        'Consent revoked. The next protected data fetch will be denied.',
      )

      await loadData(false)
    } catch (err) {
      setError(err.message || 'Unable to revoke consent.')
    } finally {
      setRevokingId(null)
    }
  }

  function formatDate(value) {
    if (!value) {
      return '—'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return date.toLocaleString()
  }

  function getStatus(consent) {
    if (consent.status) {
      return consent.status
    }

    if (consent.revoked_at) {
      return 'REVOKED'
    }

    return 'ACTIVE'
  }

  const activeConsents = consents.filter(
    (consent) => getStatus(consent) === 'ACTIVE',
  )

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">Home / Citizen / Consent &amp; Data</div>
          <h1>Consent &amp; Data</h1>
          <p>
            Control how MahaSetu uses your information and review data access
            activity.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          onClick={() => loadData(false)}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="setu-success-message" role="status">
          {message}
        </div>
      )}

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>My Consent</h2>
            <p>
              Active consent allows the SETU hub to retrieve only the approved
              information for the selected journey.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={handleGrantConsent}
            disabled={granting || activeConsents.length > 0}
          >
            {granting ? 'Granting...' : 'Grant Consent'}
          </button>
        </div>

        {loading ? (
          <p>Loading consent information...</p>
        ) : consents.length === 0 ? (
          <div className="setu-empty-state">
            <strong>No consent records found.</strong>
            <p>
              Grant consent when you want MahaSetu to process your scholarship
              journey.
            </p>
          </div>
        ) : (
          <div className="setu-table-wrapper">
            <table className="setu-table">
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Journey</th>
                  <th>Fields</th>
                  <th>Source Systems</th>
                  <th>Granted</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {consents.map((consent) => {
                  const status = getStatus(consent)
                  const isActive = status === 'ACTIVE'

                  return (
                    <tr key={consent.id}>
                      <td>
                        <strong>{consent.purpose || '—'}</strong>
                      </td>

                      <td>{consent.journey_id || '—'}</td>

                      <td>
                        {Array.isArray(consent.fields)
                          ? consent.fields.join(', ')
                          : '—'}
                      </td>

                      <td>
                        {Array.isArray(consent.source_systems)
                          ? consent.source_systems.join(', ')
                          : '—'}
                      </td>

                      <td>{formatDate(consent.granted_at)}</td>

                      <td>{formatDate(consent.expires_at)}</td>

                      <td>
                        <span className="status-badge">
                          {status}
                        </span>
                      </td>

                      <td>
                        {isActive ? (
                          <button
                            className="button button-secondary"
                            type="button"
                            onClick={() => handleRevokeConsent(consent.id)}
                            disabled={revokingId === consent.id}
                          >
                            {revokingId === consent.id
                              ? 'Revoking...'
                              : 'Revoke'}
                          </button>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Access Log</h2>
            <p>
              See when government systems requested your data and whether the
              request was allowed or denied.
            </p>
          </div>
        </div>

        {loading ? (
          <p>Loading access log...</p>
        ) : accessLog.length === 0 ? (
          <div className="setu-empty-state">
            <strong>No access activity yet.</strong>
            <p>
              Data access events will appear here when a connected system
              requests your information.
            </p>
          </div>
        ) : (
          <div className="setu-table-wrapper">
            <table className="setu-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>System</th>
                  <th>Purpose</th>
                  <th>Fields Requested</th>
                  <th>Application</th>
                  <th>Outcome</th>
                </tr>
              </thead>

              <tbody>
                {accessLog.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.at || entry.created_at)}</td>
                    <td>
                      <strong>{entry.system_code || '—'}</strong>
                    </td>
                    <td>{entry.purpose || '—'}</td>
                    <td>
                      {Array.isArray(entry.fields)
                        ? entry.fields.join(', ')
                        : '—'}
                    </td>
                    <td>{entry.application_id ?? '—'}</td>
                    <td>
                      <span className="status-badge">
                        {entry.outcome || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="page-footer">
        Your consent controls data access. Revoking consent blocks the next
        protected fetch.
      </footer>
    </main>
  )
}

export default CitizenConsentPage
