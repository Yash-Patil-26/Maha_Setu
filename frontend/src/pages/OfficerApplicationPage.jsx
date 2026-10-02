import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { getJourneyLabel } from '../constants/journeyLabels.js'
import { getStepLabel } from '../constants/stepLabels.js'

function OfficerApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const applyApplicationData = useCallback((data) => {
    setApplication({
      ...data,
      name: data.applicant_name || 'Citizen',
      scheme: getJourneyLabel(data.journey_id),
      submitted: new Date(data.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    })
  }, [])

  const fetchApplication = useCallback(async () => {
    const data = await apiRequest(`/api/applications/${id}`)
    return data
  }, [id])

  const loadApplication = useCallback(async () => {
    try {
      setLoading(true)
      setError('')

      const data = await fetchApplication()
      applyApplicationData(data)
    } catch (err) {
      setError(err.message || 'Failed to load application')
    } finally {
      setLoading(false)
    }
  }, [applyApplicationData, fetchApplication])

  useEffect(() => {
    let cancelled = false

    fetchApplication()
      .then((data) => {
        if (cancelled) return
        applyApplicationData(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message || 'Failed to load application')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyApplicationData, fetchApplication])

  async function handleOpenBss() {
    try {
      setActionLoading(true)
      setActionError('')

      const result = await apiRequest('/api/auth/sso-token', {
        method: 'POST',
        body: JSON.stringify({
          audience: 'bss',
        }),
      })

      if (!result?.url) {
        throw new Error('BSS SSO URL was not returned by SETU.')
      }

      const popup = window.open(
        result.url,
        '_blank',
        'noopener,noreferrer',
      )

      if (!popup) {
        window.location.assign(result.url)
      }
    } catch (err) {
      setActionError(
        err.message || 'Unable to open BSS through SETU SSO',
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRetry() {
    try {
      setActionLoading(true)
      setActionError('')

      await apiRequest(`/api/applications/${id}/retry`, {
        method: 'POST',
      })

      await loadApplication()
    } catch (err) {
      setActionError(
        err.message || 'Failed to retry application',
      )
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="setu-dashboard-page">
        <div className="setu-page-heading">
          <h1>Loading Application...</h1>
          <p>Fetching application details from MahaSetu.</p>
        </div>
      </main>
    )
  }

  if (error || !application) {
    return (
      <main className="setu-dashboard-page">
        <div className="setu-page-heading">
          <h1>Application Not Found</h1>
          <p>{error || 'Application details are unavailable.'}</p>

          <button
            className="button button-secondary"
            type="button"
            onClick={() => navigate('/officer')}
          >
            Back to Officer Dashboard
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Officer Dashboard / Applications / {id}
          </div>

          <h1>Application Details</h1>

          <p>
            Review this application and continue it through the connected benefit service.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          onClick={() => navigate('/officer')}
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M15 10H5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="m9 5-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {' '}Back to Applications
        </button>
      </div>

      <section className="setu-content-card">
        <div className="setu-application-heading">
          <div>
            <span className="setu-label">Application ID</span>
            <h2>APP-{String(application.id).padStart(6, '0')}</h2>
          </div>

          <StatusBadge status={application.status} />
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Application Context</h2>
            <p>
              Key information for reviewing this application.
            </p>
          </div>
        </div>

        <div className="setu-detail-grid">
          <div>
            <span>Applicant</span>
            <strong>{application.name}</strong>
          </div>

          <div>
            <span>Service</span>
            <strong>{getJourneyLabel(application.journey_id)}</strong>
          </div>

          <div>
            <span>Submitted On</span>
            <strong>{application.submitted}</strong>
          </div>

          <div>
            <span>Current Stage</span>
            <strong>
              {getStepLabel(application.current_step) || 'Not available'}
            </strong>
          </div>

          <div>
            <span>Outcome</span>
            <strong>
              {application.outcome
                ? application.outcome
                    .toLowerCase()
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (char) => char.toUpperCase())
                : 'Pending'}
            </strong>
          </div>

        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Ready for your decision</h2>
            <p>
              This application is ready for review. Opening it will take you to
              the scheme system. You won't need to log in again.
            </p>
          </div>
        </div>

        {actionError && (
          <div className="setu-error-message">
            {actionError}
          </div>
        )}

        <div className="setu-decision-actions">
          {application.status === 'PAUSED_EXCEPTION' ? (
            <button
              className="setu-review-button"
              type="button"
              onClick={handleRetry}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Retrying journey…'
                : 'Retry Processing'}
            </button>
          ) : (
            <button
              className="setu-approve-button"
              type="button"
              onClick={handleOpenBss}
              disabled={actionLoading}
            >
              {actionLoading
                ? 'Opening BSS…'
                : 'Open scheme system'}
            </button>
          )}
        </div>
      </section>
</main>
  )
}

export default OfficerApplicationPage
