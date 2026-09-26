import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function OfficerApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const result = await apiRequest(
        `/api/applications/${id}`,
      )

      setApplication(result)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    // The load function performs asynchronous API synchronization.
    // Keep the initial invocation outside the synchronous effect body.
    window.setTimeout(() => {
      void load();
    }, 0)

    const timer = window.setInterval(
      load,
      3000,
    )

    return () =>
      window.clearInterval(timer)
  }, [id])

  async function retry() {
    setBusy(true)

    try {
      await apiRequest(
        `/api/applications/${id}/retry`,
        {
          method: 'POST',
        },
      )

      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function openBss() {
    setBusy(true)

    try {
      const result = await apiRequest(
        '/api/auth/sso-token',
        {
          method: 'POST',
          body: JSON.stringify({
            audience: 'bss',
          }),
        },
      )

      window.location.href = result.url
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (!application) {
    return (
      <main>
        <p>
          {error || 'Loading application…'}
        </p>
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
            Live data from the SETU application service.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          onClick={() => navigate('/officer')}
        >
          Back
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="setu-content-card">
        <div className="setu-application-heading">
          <div>
            <span className="setu-label">
              Application ID
            </span>
            <h2>{application.id}</h2>
          </div>

          <span className="setu-status">
            {application.status}
          </span>
        </div>
      </section>

      <section className="setu-content-card">
        <h2>Decision / Recovery</h2>

        <p>
          Approval and rejection are produced by BSS
          and returned to SETU through the signed
          webhook. Retry is available for paused
          applications.
        </p>

        <div className="setu-decision-actions">
          <button
            className="setu-approve-button"
            type="button"
            onClick={openBss}
            disabled={busy}
          >
            Open BSS via SSO
          </button>

          <button
            className="setu-review-button"
            type="button"
            onClick={retry}
            disabled={
              busy ||
              application.status !==
                'PAUSED_EXCEPTION'
            }
          >
            Retry paused application
          </button>
        </div>
      </section>

      <section className="setu-content-card">
        <h2>Application state</h2>

        <pre style={{ overflowX: 'auto' }}>
          {JSON.stringify(
            application,
            null,
            2,
          )}
        </pre>
      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerApplicationPage
