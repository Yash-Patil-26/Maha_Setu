import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CITIZEN_SERVICES } from '../fixtures/citizen'
import {
  createFixtureApplication,
  hasConsent,
  saveConsent,
} from '../fixtures/citizenFlow'

function CitizenApplyPage() {
  const { journeyId } = useParams()
  const navigate = useNavigate()
  const service = CITIZEN_SERVICES.find(
    (item) => item.journeyId === journeyId,
  )

  const [consentGranted, setConsentGranted] = useState(
    hasConsent(journeyId),
  )
  const [error, setError] = useState('')

  if (!service) {
    return (
      <main>
        <h1>Service not found</h1>
        <p>The requested service is unavailable.</p>
        <a href="/citizen">Back to dashboard</a>
      </main>
    )
  }

  function handleConsent() {
    saveConsent(journeyId)
    setConsentGranted(true)
    setError('')
  }

  function handleApply() {
    if (!hasConsent(journeyId)) {
      setError('Consent is required before applying.')
      return
    }

    const applicationId = createFixtureApplication(journeyId)
    navigate(`/citizen/applications/${applicationId}`)
  }

  return (
    <main>
      <header>
        <p>Citizen Dashboard / {service.title}</p>
        <h1>Apply for {service.title}</h1>
        <p>{service.description}</p>
      </header>

      <section>
        <h2>Consent</h2>
        <p>
          I consent to SETU using the information required to process
          this application.
        </p>

        <button
          type="button"
          onClick={handleConsent}
          disabled={consentGranted}
        >
          {consentGranted ? 'Consent granted' : 'Grant consent'}
        </button>
      </section>

      <section>
        <h2>Apply</h2>
        <button
          type="button"
          onClick={handleApply}
          disabled={!consentGranted}
        >
          Apply
        </button>
      </section>

      {error && <p role="alert">{error}</p>}

      <footer>Synthetic data — prototype</footer>
    </main>
  )
}

export default CitizenApplyPage
