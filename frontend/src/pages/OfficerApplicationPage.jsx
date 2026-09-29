import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function formatOfficerScheme(value) {
  const labels = {
    scholarship_v1: 'Scholarship Service',
    youth_enterprise_v1: 'Youth Enterprise Service',
  }

  return labels[value] || value
}

function formatOfficerStatus(value) {
  const labels = {
    CREATED: 'Application started',
    IN_PROGRESS: 'In progress',
    BLOCKED_CONSENT: 'Consent required',
    PAUSED_EXCEPTION: 'Processing paused',
    NEEDS_REVIEW: 'Needs review',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Not approved',
    NOT_ELIGIBLE: 'Not eligible',
  }

  return labels[value] || value
}

function formatOfficerStep(value) {
  const labels = {
    fetch_income: 'Verifying income',
    fetch_enrolment: 'Verifying education record',
    evaluate_eligibility: 'Checking eligibility',
    submit_bss: 'Submitted to benefit service',
    await_decision: 'Awaiting decision',
  }

  return labels[value] || value
}

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
      name: 'Citizen applicant',
      scheme: data.journey_id,
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

  const stepCount = Array.isArray(application.steps)
    ? application.steps.length
    : 0

  const provenanceCount =
    application.provenance &&
    typeof application.provenance === 'object'
      ? Object.keys(application.provenance).length
      : 0

  const externalReferenceCount =
    application.external_refs &&
    typeof application.external_refs === 'object'
      ? Object.keys(application.external_refs).length
      : 0

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
          ← Back to Applications
        </button>
      </div>

      <section className="setu-content-card">
        <div className="setu-application-heading">
          <div>
            <span className="setu-label">Application ID</span>
            <h2>APP-{String(application.id).padStart(6, '0')}</h2>
          </div>

          <span
            className={`setu-status ${application.status
              .toLowerCase()
              .replaceAll(' ', '-')}`}
          >
            {formatOfficerStatus(application.status)}
          </span>
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
            <strong>
              {formatOfficerScheme(application.journey_id)}
            </strong>
          </div>

          <div>
            <span>Submitted On</span>
            <strong>{application.submitted}</strong>
          </div>

          <div>
            <span>Current Stage</span>
            <strong>
              {formatOfficerStep(application.current_step) ||
                'Not available'}
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

          <div>
            <span>Service Version</span>
            <strong>
              {application.journey_version ?? 'Not available'}
            </strong>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Interoperability Context</h2>
            <p>
              Connected systems and processing evidence associated with this application.
            </p>
          </div>
        </div>

        <div className="setu-detail-grid">
          <div>
            <span>Journey Steps</span>
            <strong>{stepCount}</strong>
          </div>

          <div>
            <span>Data Provenance Entries</span>
            <strong>{provenanceCount}</strong>
          </div>

          <div>
            <span>Connected References</span>
            <strong>{externalReferenceCount}</strong>
          </div>

          <div>
            <span>Information Source</span>
            <strong>Connected government systems</strong>
          </div>
        </div>

        <details className="setu-technical-details">
          <summary>Technical traceability</summary>

          <div className="setu-technical-grid">
            <div>
              <span>Correlation ID</span>
              <strong>
                {application.correlation_id || 'Not available'}
              </strong>
            </div>

            <div>
              <span>Citizen Reference</span>
              <strong>
                {application.master_id || 'Not assigned'}
              </strong>
            </div>
          </div>
        </details>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Connected Decision Process</h2>
            <p>
              The officer review remains in BSS while SETU coordinates the
              application state and receives the signed result.
            </p>
          </div>
        </div>

        <div className="setu-verification-list">
          <div>
            <span className="setu-check">1</span>
            <div>
              <strong>Open the connected system</strong>
              <small>
                SETU signs you into the connected benefit system without another login.
              </small>
            </div>
          </div>

          <div>
            <span className="setu-check">2</span>
            <div>
              <strong>Complete the decision</strong>
              <small>
                Review the application and record the decision in the connected system.
              </small>
            </div>
          </div>

          <div>
            <span className="setu-check">3</span>
            <div>
              <strong>Decision returned to MAHA SETU</strong>
              <small>
                The completed decision is securely returned to MAHA SETU and the application status is updated.
              </small>
            </div>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Officer Decision</h2>
            <p>
              Open the connected benefit system to review and complete this application decision.
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
                : 'Open BSS via SETU SSO'}
            </button>
          )}
        </div>
      </section>
</main>
  )
}

export default OfficerApplicationPage
