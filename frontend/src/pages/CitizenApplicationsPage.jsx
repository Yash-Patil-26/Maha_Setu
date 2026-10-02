import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { getJourneyLabel } from '../constants/journeyLabels.js'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CitizenApplicationsPage() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiRequest('/api/applications?limit=50&offset=0')
      .then((result) => {
        if (!active) return
        setApplications(Array.isArray(result) ? result : [])
      })
      .catch((err) => {
        if (!active) return
        setError(err.message || 'Unable to load your applications.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Citizen / My Applications
          </span>
          <h1>My Applications</h1>
          <p>
            Track every application you have started through MAHA SETU.
          </p>
        </div>
      </div>

      <section className="setu-content-card">
        {loading ? (
          <p aria-live="polite">Loading your applications...</p>
        ) : error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : applications.length === 0 ? (
          <div className="setu-empty-state">
            <h2>No applications yet</h2>
            <p>
              Start a service and your application will appear here.
            </p>
            <Link className="button" to="/citizen/apply">
              Browse schemes
            </Link>
          </div>
        ) : (
          <div className="setu-table-wrapper">
            <table className="setu-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>
                        APP-{String(application.id).padStart(6, '0')}
                      </strong>
                    </td>
                    <td>{getJourneyLabel(application.journey_id)}</td>
                    <td>
                      <StatusBadge status={application.status} />
                    </td>
                    <td>{formatDate(application.created_at)}</td>
                    <td>
                      <Link
                        className="setu-view-button"
                        to={`/citizen/applications/${application.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
