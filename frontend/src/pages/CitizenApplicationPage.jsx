import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { apiRequest } from '../api/client.js'

const SERVICE_META = {
  scholarship_v1: {
    title: 'Post-Matric Scholarship',
    description:
      'Track your scholarship application and its connected verification journey.',
  },
  youth_enterprise_v1: {
    title: 'Youth Enterprise Support',
    description:
      'Track your connected application and eligibility review.',
  },
}

const STATUS_LABELS = {
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

const STEP_LABELS = {
  fetch_income: 'Income verified',
  fetch_enrolment: 'Education record verified',
  evaluate_eligibility: 'Eligibility checked',
  submit_bss: 'Application submitted',
  await_decision: 'Decision pending',
}

function humanizeToken(value) {
  if (value == null || value === '') {
    return '—'
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatService(value) {
  return (
    SERVICE_META[value]?.title ||
    humanizeToken(value)
  )
}

function formatStatus(value) {
  return STATUS_LABELS[value] || humanizeToken(value)
}

function formatStep(value) {
  return STEP_LABELS[value] || humanizeToken(value)
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusMessage(status, currentStep, outcome) {
  if (status === 'APPROVED') {
    return 'Your application has been approved.'
  }

  if (status === 'REJECTED') {
    return 'A decision has been recorded for this application.'
  }

  if (status === 'NOT_ELIGIBLE') {
    return 'The eligibility checks for this application are complete.'
  }

  if (status === 'PAUSED_EXCEPTION') {
    return 'Processing is paused and may need attention.'
  }

  if (status === 'BLOCKED_CONSENT') {
    return 'Consent is needed before processing can continue.'
  }

  if (
    status === 'SUBMITTED' &&
    currentStep === 'await_decision'
  ) {
    return 'Your application has been submitted and a decision is pending from the connected service.'
  }

  if (outcome === 'ELIGIBLE') {
    return 'The connected eligibility checks are complete and your application has moved to the next stage.'
  }

  return 'Your application is being processed through the connected service journey.'
}

function normalizeApplication(raw) {
  return {
    ...raw,
    id: raw.id ?? raw.application_id,
    steps: Array.isArray(raw.steps) ? raw.steps : [],
    canonical: raw.canonical || {},
    provenance: raw.provenance || {},
    metrics: raw.metrics || {
      fields_total: 0,
      fields_autofilled: 0,
      citizen_typed: 0,
      documents_not_uploaded: 0,
      systems_queried: 0,
    },
    external_refs: raw.external_refs || {},
  }
}

function CitizenApplicationPage() {
  const { id } = useParams()

  const [application, setApplication] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let timer

    async function load() {
      try {
        const result = await apiRequest(
          `/api/applications/${id}`,
        )

        if (active) {
          setApplication(normalizeApplication(result))
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(
            err.message ||
              'Unable to load this application.',
          )
        }
      }
    }

    void load()

    timer = window.setInterval(load, 3000)

    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [id])

  if (error) {
    return (
      <main className="setu-application-page">
        <div className="setu-application-breadcrumb">
          <Link to="/citizen">
            Citizen Dashboard
          </Link>
          <span aria-hidden="true">&gt;</span>
          <span>Application</span>
        </div>

        <section className="setu-application-error">
          <p className="setu-application-eyebrow">
            Application
          </p>

          <h1>Application unavailable</h1>

          <p className="form-error" role="alert">
            {error}
          </p>

          <Link
            className="button button-secondary"
            to="/citizen"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    )
  }

  if (!application) {
    return (
      <main className="setu-application-page">
        <div className="setu-application-breadcrumb">
          <Link to="/citizen">
            Citizen Dashboard
          </Link>
          <span aria-hidden="true">&gt;</span>
          <span>Application</span>
        </div>

        <section className="setu-application-loading">
          <p className="setu-application-eyebrow">
            Application
          </p>

          <h1>Loading your application</h1>

          <p aria-live="polite">
            Please wait while the latest application
            information is retrieved.
          </p>
        </section>
      </main>
    )
  }

  const serviceTitle = formatService(
    application.journey_id,
  )

  const statusLabel = formatStatus(
    application.status,
  )

  const currentStage = formatStep(
    application.current_step,
  )

  const statusMessage = getStatusMessage(
    application.status,
    application.current_step,
    application.outcome,
  )

  return (
    <main className="setu-application-page">
      <div className="setu-application-breadcrumb">
        <Link to="/citizen">
          Citizen Dashboard
        </Link>

        <span aria-hidden="true">&gt;</span>

        <span>Applications</span>

        <span aria-hidden="true">&gt;</span>

        <span>{serviceTitle}</span>
      </div>

      <header className="setu-application-header">
        <div>
          <p className="setu-application-eyebrow">
            Service application
          </p>

          <h1>{serviceTitle}</h1>

          <p className="setu-application-subtitle">
            Application #{application.id}
            {' · '}
            {statusLabel}
          </p>
        </div>

        <Link
          className="button button-secondary"
          to="/citizen"
        >
          Back to applications
        </Link>
      </header>

      <section className="setu-application-hero">
        <div className="setu-application-hero-copy">
          <span className="setu-application-status">
            {statusLabel}
          </span>

          <h2>
            {currentStage}
          </h2>

          <p>
            {statusMessage}
          </p>
        </div>

        <div className="setu-application-reference">
          <div>
            <span>Reference number</span>

            <strong>
              {application.correlation_id || '—'}
            </strong>
          </div>

          <div>
            <span>Submitted</span>

            <strong>
              {formatDateTime(application.created_at)}
            </strong>
          </div>
        </div>
      </section>

      <div className="setu-application-grid">
        <div className="setu-application-main">
          <section className="setu-application-card">
            <div className="setu-application-card-heading">
              <div>
                <p className="setu-application-eyebrow">
                  Application journey
                </p>

                <h2>Application progress</h2>

                <p>
                  Follow each stage as your application
                  moves through the connected service.
                </p>
              </div>
            </div>

            <Timeline steps={application.steps} />
          </section>

          <DataCard
            canonical={application.canonical}
            provenance={application.provenance}
          />
        </div>

        <aside className="setu-application-sidebar">
          <section className="setu-application-card">
            <p className="setu-application-eyebrow">
              At a glance
            </p>

            <h2>Application summary</h2>

            <div className="setu-application-summary">
              <div>
                <span>Service</span>
                <strong>{serviceTitle}</strong>
              </div>

              <div>
                <span>Current stage</span>
                <strong>{currentStage}</strong>
              </div>

              <div>
                <span>Outcome</span>
                <strong>
                  {application.outcome
                    ? humanizeToken(application.outcome)
                    : 'Pending'}
                </strong>
              </div>

              <div>
                <span>Last updated</span>
                <strong>
                  {formatDateTime(
                    application.updated_at,
                  )}
                </strong>
              </div>
            </div>
          </section>

          <OnceOnlyMeter
            metrics={application.metrics}
          />
        </aside>
      </div>

      <details className="setu-technical-details setu-application-technical">
        <summary>
          Technical details
        </summary>

        <div className="setu-technical-grid">
          <div>
            <span>Application ID</span>
            <strong>{application.id}</strong>
          </div>

          <div>
            <span>Citizen reference</span>
            <strong>{application.master_id || '—'}</strong>
          </div>

          <div>
            <span>Service version</span>
            <strong>
              {application.journey_version ?? '—'}
            </strong>
          </div>

          <div>
            <span>Correlation ID</span>
            <strong>
              {application.correlation_id || '—'}
            </strong>
          </div>

          {Object.entries(
            application.external_refs || {},
          ).map(([key, value]) => (
            <div key={key}>
              <span>{humanizeToken(key)}</span>
              <strong>{String(value)}</strong>
            </div>
          ))}
        </div>
      </details>
    </main>
  )
}

export default CitizenApplicationPage
