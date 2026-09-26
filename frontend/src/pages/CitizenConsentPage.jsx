import { useState } from 'react'
import { CITIZEN_CONSENTS } from '../fixtures/consent'

function CitizenConsentPage() {
  const [consents, setConsents] = useState(CITIZEN_CONSENTS)

  function handleRevoke(consentId) {
    setConsents((current) =>
      current.map((consent) =>
        consent.id === consentId
          ? { ...consent, status: 'REVOKED' }
          : consent,
      ),
    )
  }

  return (
    <main>
      <header className="dashboard-header">
        <div>
          <h1>My Consents</h1>
          <p>Review and manage the data-sharing permissions you have granted.</p>
        </div>
      </header>

      <section className="consent-list" aria-label="Consent records">
        {consents.map((consent) => (
          <article className="consent-card" key={consent.id}>
            <div className="consent-card-header">
              <div>
                <h2>{consent.purpose}</h2>
                <p>
                  Status:{' '}
                  <strong>{consent.status}</strong>
                </p>
              </div>
            </div>

            <div className="consent-details">
              <div>
                <h3>Data fields</h3>
                <ul>
                  {consent.fields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Source systems</h3>
                <ul>
                  {consent.source_systems.map((system) => (
                    <li key={system}>{system}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3>Granted</h3>
                <p>{consent.granted_at}</p>
              </div>

              <div>
                <h3>Expires</h3>
                <p>{consent.expires_at ?? 'No expiry'}</p>
              </div>
            </div>

            {consent.status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => handleRevoke(consent.id)}
              >
                Revoke consent
              </button>
            )}

            {consent.status === 'REVOKED' && (
              <p>
                This consent has been revoked. Future access should be denied
                by the backend consent enforcement service.
              </p>
            )}
          </article>
        ))}
      </section>

      <footer>Synthetic data � prototype</footer>
    </main>
  )
}

export default CitizenConsentPage
