import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CITIZEN_SERVICES } from '../fixtures/citizen'
import { apiRequest } from '../api/client.js'

function consentPurpose(journeyId) {
  if (journeyId === 'scholarship_v1') {
    return 'scholarship_eligibility'
  }

  if (journeyId === 'youth_enterprise_v1') {
    return 'youth_enterprise_eligibility'
  }

  return null
}

function CitizenApplyPage() {
  const { journeyId } = useParams()
  const navigate = useNavigate()

  const service = CITIZEN_SERVICES.find(
    (item) => item.journeyId === journeyId,
  )

  const [consentId, setConsentId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!service) {
    return (
      <main>
        <h1>Service not found</h1>
      </main>
    )
  }

  async function grantConsent() {
    const purpose = consentPurpose(journeyId)

    if (!purpose) {
      setError('Unsupported journey consent purpose.')
      return
    }

    setError('')
    setBusy(true)

    try {
      const result = await apiRequest('/api/consents', {
        method: 'POST',
        body: JSON.stringify({
          journey_id: journeyId,
          purpose,
        }),
      })

      setConsentId(result.id)
    } catch (err) {
      setError(
        err.message ||
          'Consent service is not available yet.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function createApplication() {
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
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <header className="page-header">
        <p>
          Citizen Dashboard / {service.title}
        </p>

        <h1>
          Apply for {service.title}
        </h1>

        <p>
          {service.description}
        </p>
      </header>

      <section className="card">
        <h2>Consent</h2>

        <p>
          Grant consent through the real SETU consent service
          before applying.
        </p>

        <button
          className="button"
          type="button"
          onClick={grantConsent}
          disabled={busy || Boolean(consentId)}
        >
          {consentId
            ? 'Consent granted'
            : 'Grant consent'}
        </button>
      </section>

      <section className="card">
        <h2>Application</h2>

        <p>
          The application will be created by the real FastAPI
          journey endpoint.
        </p>

        <button
          className="button"
          type="button"
          onClick={createApplication}
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
