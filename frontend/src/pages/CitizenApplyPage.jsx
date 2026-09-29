import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

const SERVICE_META = {
  scholarship_v1: {
    title: 'Post-Matric Scholarship',
    description:
      'Apply using information already held by connected government departments.',
    purpose: 'scholarship_eligibility',
    sources: [
      'Revenue Department',
      'Education Department',
    ],
    information:
      'Income and education records needed to check eligibility.',
  },
  youth_enterprise_v1: {
    title: 'Youth Enterprise Support',
    description:
      'Apply using connected training and employment information.',
    purpose: 'youth_enterprise_eligibility',
    sources: [
      'Skills & Employment Registry',
    ],
    information:
      'Training and employment records needed to support eligibility.',
  },
}

function CitizenApplyPage() {
  const { journeyId } = useParams()
  const navigate = useNavigate()

  const service = SERVICE_META[journeyId]
  const servicePurpose = service?.purpose

  const [consent, setConsent] = useState(null)
  const [loadingConsent, setLoadingConsent] = useState(
    Boolean(servicePurpose),
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true

    async function loadExistingConsent() {
      try {
        const result = await apiRequest('/api/consents')

        const existing = Array.isArray(result)
          ? result.find(
              (item) =>
                item.journey_id === journeyId &&
                item.purpose === servicePurpose &&
                item.status === 'ACTIVE',
            )
          : null

        if (active) {
          setConsent(existing || null)
          setError('')
        }
      } catch {
        if (active) {
          setConsent(null)
        }
      } finally {
        if (active) {
          setLoadingConsent(false)
        }
      }
    }

    if (servicePurpose) {
      void loadExistingConsent()
    }

    return () => {
      active = false
    }
  }, [journeyId, servicePurpose])

  if (!service) {
    return (
      <main className="setu-citizen-flow-page">
        <div className="setu-flow-breadcrumb">
          <Link to="/citizen">Citizen Dashboard</Link>
          <span aria-hidden="true">&gt;</span>
          <span>Service</span>
        </div>

        <section className="setu-flow-error">
          <p className="setu-flow-eyebrow">Citizen Services</p>
          <h1>Service not found</h1>
          <p>
            The requested service is not currently available.
          </p>
          <Link
            className="button button-secondary"
            to="/citizen"
          >
            Back to services
          </Link>
        </section>
      </main>
    )
  }

  async function handleConsent() {
    if (consent) {
      return
    }

    setError('')
    setBusy(true)

    try {
      const result = await apiRequest('/api/consents', {
        method: 'POST',
        body: JSON.stringify({
          journey_id: journeyId,
          purpose: service.purpose,
        }),
      })

      setConsent(result)
    } catch (err) {
      setError(
        err.message ||
          'Unable to save your permission.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleApply() {
    if (!consent) {
      setError(
        'Please allow access to the required information before continuing.',
      )
      return
    }

    setError('')
    setBusy(true)

    try {
      const result = await apiRequest('/api/applications', {
        method: 'POST',
        body: JSON.stringify({
          journey_id: journeyId,
        }),
      })

      navigate(
        `/citizen/applications/${result.application_id}`,
      )
    } catch (err) {
      setError(
        err.message ||
          'Unable to start your application.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="setu-citizen-flow-page">
      <div className="setu-flow-breadcrumb">
        <Link to="/citizen">Citizen Dashboard</Link>
        <span aria-hidden="true">&gt;</span>
        <span>Services</span>
        <span aria-hidden="true">&gt;</span>
        <span>{service.title}</span>
      </div>

      <header className="setu-flow-header">
        <div>
          <p className="setu-flow-eyebrow">
            Citizen service
          </p>

          <h1>{service.title}</h1>

          <p>
            {service.description}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/citizen"
        >
          Back to services
        </Link>
      </header>

      <section className="setu-flow-hero">
        <div>
          <span className="setu-flow-step">
            Before you begin
          </span>

          <h2>
            Use your information once, not again and again.
          </h2>

          <p>
            MAHA SETU can use the specific information needed
            for this service from connected government records,
            with your permission.
          </p>
        </div>

        <div className="setu-flow-source-summary">
          <span>Information sources</span>

          <div>
            {service.sources.map((source) => (
              <span
                className="setu-flow-source-chip"
                key={source}
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="setu-flow-grid">
        <section className="setu-flow-card setu-flow-consent-card">
          <div className="setu-flow-card-heading">
            <div className="setu-flow-icon" aria-hidden="true">
              ✓
            </div>

            <div>
              <p className="setu-flow-eyebrow">
                Step 1
              </p>

              <h2>Allow access to your information</h2>

              <p>
                {service.information}
              </p>
            </div>
          </div>

          <div className="setu-flow-consent-copy">
            <strong>
              You stay in control
            </strong>

            <p>
              Your permission applies to this service.
              You can review or stop data sharing later
              from <Link to="/citizen/consents">Consent &amp; Data</Link>.
            </p>
          </div>

          <div className="setu-flow-action-row">
            <button
              className="button"
              type="button"
              onClick={handleConsent}
              disabled={
                busy ||
                loadingConsent ||
                Boolean(consent)
              }
            >
              {loadingConsent
                ? 'Checking your permission…'
                : consent
                  ? 'Access allowed'
                  : 'Allow access & continue'}
            </button>

            {consent && (
              <span className="setu-flow-success">
                Your permission is active.
              </span>
            )}
          </div>

          {consent?.expires_at && (
            <p className="setu-flow-note">
              Permission active until{' '}
              {new Date(
                consent.expires_at,
              ).toLocaleDateString(
                'en-IN',
                {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                },
              )}
              .
            </p>
          )}
        </section>

        <aside className="setu-flow-card setu-flow-next-card">
          <p className="setu-flow-eyebrow">
            Step 2
          </p>

          <h2>Start your application</h2>

          <p>
            Once access is allowed, MAHA SETU will
            process the application using the connected
            service journey.
          </p>

          <button
            className="button setu-flow-primary-action"
            type="button"
            onClick={handleApply}
            disabled={busy || !consent}
          >
            {busy
              ? 'Starting application…'
              : 'Start application'}
          </button>

          {!consent && (
            <p className="setu-flow-disabled-note">
              Allow access above to continue.
            </p>
          )}
        </aside>
      </div>

      {error && (
        <p
          className="form-error setu-flow-error-message"
          role="alert"
        >
          {error}
        </p>
      )}
    </main>
  )
}

export default CitizenApplyPage
