import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

const SERVICE_META = {
  scholarship_v1: {
    title: 'Post-Matric Scholarship',
    marathi: 'पदव्युत्तर शिष्यवृत्ती',
    description:
      'Check eligibility and apply using consented Revenue and Education records.',
    purpose: 'scholarship_eligibility',
  },

  youth_enterprise_v1: {
    title: 'Youth Enterprise Support',
    marathi: 'युवा उद्योजक सहाय्य',
    description:
      'Use connected training records to support youth enterprise eligibility.',
    purpose: 'youth_enterprise_eligibility',
  },
}

function CitizenApplyPage() {
  const { journeyId } = useParams()
  const navigate = useNavigate()

  const service = SERVICE_META[journeyId]
  const servicePurpose = service?.purpose

  const [consentId, setConsentId] = useState(null)
  const [loadingConsent, setLoadingConsent] = useState(() =>
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
              (consent) =>
                consent.journey_id === journeyId &&
                consent.purpose === servicePurpose &&
                consent.status === 'ACTIVE',
            )
          : null

        if (active) {
          setConsentId(existing?.id ?? null)
          setError('')
        }
      } catch {
        if (active) {
          setConsentId(null)
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
      <main>
        <header className="page-header">
          <h1>Service not found</h1>
          <p>The requested service is not available.</p>
        </header>

        <a className="button button-secondary" href="/citizen">
          Back to dashboard
        </a>
      </main>
    )
  }

  async function handleConsent() {
    if (consentId) {
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

      setConsentId(result.id)
    } catch (err) {
      setError(err.message || 'Unable to grant consent.')
    } finally {
      setBusy(false)
    }
  }

  async function handleApply() {
    if (!consentId) {
      setError('Please grant consent before applying.')
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
      setError(err.message || 'Unable to create application.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <header className="page-header">
        <p>Citizen Dashboard / {service.title}</p>

        <h1>Apply for {service.title}</h1>

        <p>{service.description}</p>
      </header>

      <section className="card">
        <h2>Consent</h2>

        <p>
          I consent to SETU using the required system data to process
          this application.
        </p>

        <button
          className="button"
          type="button"
          onClick={handleConsent}
          disabled={
            busy ||
            loadingConsent ||
            Boolean(consentId)
          }
        >
          {loadingConsent
            ? 'Checking consent…'
            : consentId
              ? 'Consent granted'
              : 'Grant consent'}
        </button>
      </section>

      <section className="card">
        <h2>Apply</h2>

        <p>
          Once consent is granted, you can create your application.
        </p>

        <button
          className="button"
          type="button"
          onClick={handleApply}
          disabled={busy || !consentId}
        >
          Create application
        </button>
      </section>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default CitizenApplyPage
