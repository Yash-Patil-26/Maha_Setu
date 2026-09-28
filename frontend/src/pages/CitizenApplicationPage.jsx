import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { apiRequest } from '../api/client.js'

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
              'Unable to load application.',
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
      <main>
        <header className="page-header">
          <p>Citizen Dashboard / Applications</p>
          <h1>Application unavailable</h1>
        </header>

        <p className="form-error" role="alert">
          {error}
        </p>

        <a className="button button-secondary" href="/citizen">
          Back to dashboard
        </a>
      </main>
    )
  }

  if (!application) {
    return (
      <main>
        <header className="page-header">
          <p>Citizen Dashboard / Applications</p>
          <h1>Loading application…</h1>
          <p>
            SETU is retrieving the latest application state.
          </p>
        </header>

        <section className="card">
          <p aria-live="polite">
            Please wait while the application journey is loaded.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main>
      <header className="page-header">
        <p>
          Citizen Dashboard / Applications
        </p>

        <h1>
          Application {application.id}
        </h1>

        <p>
          Live application state from SETU.
        </p>
      </header>

      <section className="card application-summary">
        <div>
          <span className="status-badge">
            {application.status}
          </span>

          <h2>Application ID</h2>

          <p className="application-id">
            {application.id}
          </p>

          <p>
            Correlation:{' '}
            {application.correlation_id || '—'}
          </p>

          <p>
            Current step:{' '}
            {application.current_step || '—'}
          </p>

          {application.outcome && (
            <p>
              Outcome: {application.outcome}
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Application progress</h2>
        <Timeline steps={application.steps} />
      </section>

      <DataCard
        canonical={application.canonical}
        provenance={application.provenance}
      />

      <OnceOnlyMeter
        metrics={application.metrics}
      />

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default CitizenApplicationPage
