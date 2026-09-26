import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

function OfficerApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const loadApplication = async () => {
      try {
        setLoading(true)
        setError('')

        const token = localStorage.getItem('setu_access_token')

        const response = await fetch(
          `http://127.0.0.1:8000/api/applications/${id}`,
          {
            headers: token
              ? {
                Authorization: `Bearer ${token}`,
              }
              : {},
          },
        )

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Application not found'
              : `Failed to load application (${response.status})`,
          )
        }

        const data = await response.json()

        setApplication({
          ...data,
          name: `Citizen ${data.user_id}`,
          scheme: data.journey_id,
          submitted: new Date(data.created_at).toLocaleDateString(
            'en-GB',
            {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            },
          ),
          category: 'Not available',
          income: 'Not available',
          education: 'Not available',
          district: 'Not available',
        })
      } catch (err) {
        setError(err.message || 'Failed to load application')
      } finally {
        setLoading(false)
      }
    }

    loadApplication()
  }, [id])

  async function handleDecision(decision) {
    try {
      setActionLoading(true)
      setActionError('')

      const token = localStorage.getItem('setu_access_token')

      if (!token) {
        throw new Error('Officer authentication token is missing')
      }

      // Step 1: SETU generates an SSO token for BSS
      const ssoResponse = await fetch(
        `http://127.0.0.1:8000/api/officer/applications/${id}/bss-sso-token`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!ssoResponse.ok) {
        const data = await ssoResponse.json().catch(() => ({}))
        throw new Error(
          data.detail || `Failed to create BSS SSO session (${ssoResponse.status})`,
        )
      }

      const ssoData = await ssoResponse.json()

      // Step 2: BSS makes the decision
      const bssResponse = await fetch(
        'http://127.0.0.1:8000/api/bss/decisions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sso_token: ssoData.sso_token,
            decision,
            reason: `Officer decision: ${decision}`,
          }),
        },
      )

      if (!bssResponse.ok) {
        const data = await bssResponse.json().catch(() => ({}))
        throw new Error(
          data.detail || `BSS decision failed (${bssResponse.status})`,
        )
      }

      // Step 3: Reload the application from SETU
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!applicationResponse.ok) {
        throw new Error(
          `Failed to refresh application (${applicationResponse.status})`,
        )
      }

      const data = await applicationResponse.json()

      setApplication({
        ...data,
        name: `Citizen ${data.user_id}`,
        scheme: data.journey_id,
        submitted: new Date(data.created_at).toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          },
        ),
        category: 'Not available',
        income: 'Not available',
        education: 'Not available',
        district: 'Not available',
      })
    } catch (err) {
      setActionError(
        err.message || 'Failed to process officer decision',
      )
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRetry() {
    try {
      setActionLoading(true)
      setActionError('')

      const token = localStorage.getItem('setu_access_token')

      if (!token) {
        throw new Error('Officer authentication token is missing')
      }

      const response = await fetch(
        `http://127.0.0.1:8000/api/officer/applications/${id}/retry`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(
          data.detail || `Retry failed (${response.status})`,
        )
      }

      // Refresh application after retry
      const applicationResponse = await fetch(
        `http://127.0.0.1:8000/api/applications/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      if (!applicationResponse.ok) {
        throw new Error(
          `Failed to refresh application (${applicationResponse.status})`,
        )
      }

      const data = await applicationResponse.json()

      setApplication({
        ...data,
        name: `Citizen ${data.user_id}`,
        scheme: data.journey_id,
        submitted: new Date(data.created_at).toLocaleDateString(
          'en-GB',
          {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          },
        ),
        category: 'Not available',
        income: 'Not available',
        education: 'Not available',
        district: 'Not available',
      })
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
            Review citizen information and make an application decision.
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
            {application.status}
          </span>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Citizen Information</h2>
            <p>Information available through SETU data access.</p>
          </div>
        </div>

        <div className="setu-detail-grid">
          <div>
            <span>Full Name</span>
            <strong>{application.name}</strong>
          </div>

          <div>
            <span>Scheme</span>
            <strong>{application.scheme}</strong>
          </div>

          <div>
            <span>Category</span>
            <strong>{application.category}</strong>
          </div>

          <div>
            <span>Annual Family Income</span>
            <strong>{application.income}</strong>
          </div>

          <div>
            <span>Education</span>
            <strong>{application.education}</strong>
          </div>

          <div>
            <span>District</span>
            <strong>{application.district}</strong>
          </div>

          <div>
            <span>Submitted On</span>
            <strong>{application.submitted}</strong>
          </div>

          <div>
            <span>Data Source</span>
            <strong>SETU Connected Systems</strong>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Data &amp; Verification</h2>
            <p>Review information used during application processing.</p>
          </div>
        </div>

        <div className="setu-verification-list">
          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Identity Information</strong>
              <small>Verified from connected identity system</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>

          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Income Certificate</strong>
              <small>Retrieved with citizen consent</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>

          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Education Details</strong>
              <small>Available from education department</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Officer Decision</h2>
            <p>Record a decision for this application.</p>
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
              {actionLoading ? 'Retrying...' : '↻ Retry Application'}
            </button>
          ) : (
            <>
              <button
                className="setu-approve-button"
                type="button"
                onClick={() => handleDecision('APPROVED')}
                disabled={
                  actionLoading ||
                  application.status === 'APPROVED' ||
                  application.status === 'REJECTED'
                }
              >
                {actionLoading ? 'Processing...' : '✓ Approve Application'}
              </button>

              <button
                className="setu-review-button"
                type="button"
                onClick={() => handleDecision('REVIEW')}
                disabled={
                  actionLoading ||
                  application.status === 'APPROVED' ||
                  application.status === 'REJECTED'
                }
              >
                {actionLoading ? 'Processing...' : '↻ Request Review'}
              </button>

              <button
                className="setu-reject-button"
                type="button"
                onClick={() => handleDecision('REJECTED')}
                disabled={
                  actionLoading ||
                  application.status === 'APPROVED' ||
                  application.status === 'REJECTED'
                }
              >
                {actionLoading ? 'Processing...' : '✕ Reject Application'}
              </button>
            </>
          )}
        </div>

      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerApplicationPage
