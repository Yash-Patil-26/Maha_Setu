import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CITIZEN_SERVICES } from '../fixtures/citizen'
import { getAccessToken, getAuthUser } from '../auth/storage.js'
import '../citizen-ui.css'

const API_BASE_URL = 'http://127.0.0.1:8000'

function CitizenApplyPage() {
  const { journeyId } = useParams()
  const navigate = useNavigate()

  const service = CITIZEN_SERVICES.find(
    (item) => item.journeyId === journeyId,
  )

  const user = getAuthUser()
  const displayName =
    user?.display_name || user?.username || 'Citizen'

  const [consentGranted, setConsentGranted] = useState(false)
  const [consent, setConsent] = useState(null)
  const [error, setError] = useState('')
  const [loadingConsent, setLoadingConsent] = useState(false)
  const [loadingApplication, setLoadingApplication] =
    useState(false)

  if (!service) {
    return (
      <main className="citizen-page">
        <div className="citizen-empty-state">
          <h1>Service not found</h1>
          <p>
            The requested service is not available.
          </p>

          <button
            className="primary-action"
            type="button"
            onClick={() => navigate('/citizen')}
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    )
  }

  async function handleConsent() {
    setLoadingConsent(true)
    setError('')

    try {
      const token = getAccessToken()

      if (!token) {
        setError(
          'Your session has expired. Please log in again.',
        )
        return
      }

      const response = await fetch(
        `${API_BASE_URL}/api/consents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            purpose: 'scholarship_eligibility',
            journey_id: journeyId,
          }),
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setError(
          'Your session has expired. Please log in again.',
        )
        return
      }

      if (response.status === 403) {
        setError(
          data.detail ||
          'Consent is not allowed for this account.',
        )
        return
      }

      if (response.status === 404) {
        setError(
          'This service or journey is currently unavailable.',
        )
        return
      }

      if (!response.ok) {
        setError(
          data.detail || 'Unable to grant consent.',
        )
        return
      }

      setConsent(data)
      setConsentGranted(true)
    } catch {
      setError(
        'Unable to connect to the SETU service. Please try again.',
      )
    } finally {
      setLoadingConsent(false)
    }
  }

  async function handleApply() {
    if (!consentGranted) {
      setError(
        'Please grant consent before applying.',
      )
      return
    }

    setLoadingApplication(true)
    setError('')

    try {
      const token = getAccessToken()

      if (!token) {
        setError(
          'Your session has expired. Please log in again.',
        )
        return
      }

      const response = await fetch(
        `${API_BASE_URL}/api/applications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            journey_id: journeyId,
          }),
        },
      )

      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setError(
          'Your session has expired. Please log in again.',
        )
        return
      }

      if (response.status === 403) {
        setError(
          data.detail ||
          'Application was not allowed. Please check your consent.',
        )
        return
      }

      if (response.status === 404) {
        setError(
          'This service or journey is currently unavailable.',
        )
        return
      }

      if (!response.ok) {
        setError(
          data.detail ||
          'Unable to create the application.',
        )
        return
      }

      if (!data.application_id) {
        setError(
          'The service returned an invalid application response.',
        )
        return
      }

      localStorage.setItem(
        'last_citizen_application_id',
        String(data.application_id),
      )

      navigate(
        `/citizen/applications/${data.application_id}`,
      )
    } catch {
      setError(
        'Unable to connect to the SETU service. Please try again.',
      )
    } finally {
      setLoadingApplication(false)
    }
  }

  return (
    <main className="citizen-page">
      {/* TOP HEADER */}
      <header className="citizen-topbar">
        <div className="citizen-brand">
          <div className="citizen-gov-mark">
            MS
          </div>

          <div>
            <div className="citizen-gov-name">
              MahaSetu
            </div>

            <div className="citizen-gov-subtitle">
              Digital Service Prototype
            </div>
          </div>
        </div>

        <div className="citizen-logo">
          <strong>
            Maha<span>Setu</span>
          </strong>

          <small>
            Unified Platform for Government Services
          </small>
        </div>

        <div className="citizen-top-actions">
          <span className="citizen-language">
            EN | मराठी
          </span>

          <button
            className="citizen-icon-button"
            type="button"
          >
            🔔
          </button>

          <div className="citizen-user-menu">
            <div className="citizen-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <span>{displayName}</span>
            <span className="user-chevron">⌄</span>
          </div>
        </div>
      </header>

      <div className="citizen-layout">
        {/* SIDEBAR */}
        <aside className="citizen-sidebar">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>Citizen</span>
            </div>
          </div>

          <nav className="citizen-nav">
            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              <span>⌂</span>
              <div>
                <strong>Dashboard</strong>
                <small>मुख्य पृष्ठ</small>
              </div>
            </button>

            <button
              className="citizen-nav-item active"
              type="button"
            >
              <span>▣</span>
              <div>
                <strong>Apply for Schemes</strong>
                <small>योजना अर्ज</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              <span>▤</span>
              <div>
                <strong>My Applications</strong>
                <small>माझे अर्ज</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>♢</span>
              <div>
                <strong>Consent &amp; Data</strong>
                <small>संमती व डेटा</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>♙</span>
              <div>
                <strong>My Profile</strong>
                <small>माझे प्रोफाइल</small>
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
            >
              <span>?</span>
              <div>
                <strong>Help &amp; Support</strong>
                <small>मदत व सहाय्य</small>
              </div>
            </button>
          </nav>
        </aside>

        {/* CONTENT */}
        <section className="citizen-content">
          <div className="citizen-breadcrumb">
            Home
            <span>›</span>
            Schemes
            <span>›</span>
            {service.title}
          </div>

          {/* SCHEME HERO */}
          <section className="scheme-detail-hero">
            <div className="scheme-detail-icon">
              🎓
            </div>

            <div className="scheme-detail-info">
              <span className="eyebrow">
                Government Scheme
              </span>

              <h1>{service.title}</h1>

              <p>
                {service.description}
              </p>

              <div className="scheme-tags">
                <span>Education</span>
                <span>State Government</span>
                <span>Digital Service</span>
              </div>
            </div>
          </section>

          {/* PROGRESS */}
          <section className="application-steps">
            <div className="step active">
              <span>1</span>
              <strong>Consent</strong>
            </div>

            <div className="step-line" />

            <div
              className={`step ${consentGranted ? 'active' : ''
                }`}
            >
              <span>2</span>
              <strong>Application</strong>
            </div>

            <div className="step-line" />

            <div className="step">
              <span>3</span>
              <strong>Review</strong>
            </div>

            <div className="step-line" />

            <div className="step">
              <span>4</span>
              <strong>Submit</strong>
            </div>
          </section>

          <div className="apply-grid">
            {/* LEFT */}
            <div>
              <section className="citizen-card">
                <div className="card-title-row">
                  <div>
                    <h2>Consent &amp; Data Access</h2>
                    <p>
                      Your Data, Your Control
                    </p>
                  </div>

                  {consentGranted && (
                    <span className="status-pill status-success">
                      ✓ Active
                    </span>
                  )}
                </div>

                <div className="consent-message">
                  <div className="consent-shield">
                    🔐
                  </div>

                  <div>
                    <strong>
                      Give consent to continue
                    </strong>

                    <p>
                      MahaSetu will securely use the
                      required information from
                      government systems to process
                      this application.
                    </p>
                  </div>
                </div>

                <div className="data-source-list">
                  <div className="data-source">
                    <span>🏛️</span>
                    <div>
                      <strong>
                        Revenue Department (REV)
                      </strong>

                      <small>
                        Income &amp; caste certificate
                      </small>
                    </div>

                    <span className="source-status">
                      Secure
                    </span>
                  </div>

                  <div className="data-source">
                    <span>🎓</span>
                    <div>
                      <strong>
                        Education Department (EDU)
                      </strong>

                      <small>
                        Academic records
                      </small>
                    </div>

                    <span className="source-status">
                      Secure
                    </span>
                  </div>
                </div>

                <button
                  className="primary-action"
                  type="button"
                  onClick={handleConsent}
                  disabled={
                    consentGranted || loadingConsent
                  }
                >
                  {loadingConsent
                    ? 'Granting consent...'
                    : consentGranted
                      ? '✓ Consent Granted'
                      : 'Grant Consent →'}
                </button>

                {consent && (
                  <div className="consent-success">
                    Consent ID: {consent.id}
                    <span>
                      Active until{' '}
                      {new Date(
                        consent.expires_at,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </section>

              <section className="citizen-card">
                <h2>About this Scheme</h2>

                <p className="body-text">
                  This service allows citizens to
                  submit an application using
                  consent-based access to required
                  government information.
                </p>

                <div className="benefit-grid">
                  <div>
                    <span>📄</span>
                    <strong>Less paperwork</strong>
                    <small>
                      Reuse verified information
                    </small>
                  </div>

                  <div>
                    <span>🔒</span>
                    <strong>Secure access</strong>
                    <small>
                      Consent based sharing
                    </small>
                  </div>

                  <div>
                    <span>⚡</span>
                    <strong>Faster processing</strong>
                    <small>
                      Digital verification
                    </small>
                  </div>
                </div>
              </section>
            </div>

            {/* RIGHT */}
            <aside className="apply-side-card">
              <div className="ready-icon">
                ✓
              </div>

              <h2>
                {consentGranted
                  ? 'Ready to Apply'
                  : 'Before You Apply'}
              </h2>

              <p>
                {consentGranted
                  ? 'Your consent is active. You can now create your application.'
                  : 'Grant consent first to allow MahaSetu to process your application.'}
              </p>

              <button
                className="primary-action large"
                type="button"
                onClick={handleApply}
                disabled={
                  !consentGranted ||
                  loadingApplication
                }
              >
                {loadingApplication
                  ? 'Creating Application...'
                  : 'Create Application →'}
              </button>

              <div className="time-estimate">
                ⏱ Estimated time: 10–15 minutes
              </div>
            </aside>
          </div>

          {error && (
            <div
              className="citizen-error"
              role="alert"
            >
              <strong>Unable to continue</strong>
              <span>{error}</span>
            </div>
          )}

          <footer className="citizen-footer">
            <div>
              <span>About MahaSetu</span>
              <span>Privacy Policy</span>
              <span>Help &amp; Support</span>
            </div>

            <small>
              MahaSetu — Digital Service Integration Prototype
            </small>
          </footer>
        </section>
      </div>
    </main>
  )
}

export default CitizenApplyPage