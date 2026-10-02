import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { ATTENTION_STATUSES } from '../constants/statusLabels.js'
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

export default function OfficerApplicationsPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/applications?limit=50')
      .then((result) => {
        const items = Array.isArray(result) ? result : result.items || []
        setApplications(items)
      })
      .catch((err) => {
        setError(err.message || 'Unable to load the approval queue.')
      })
      .finally(() => setLoading(false))
  }, [])

  const queue = applications.filter((application) =>
    ATTENTION_STATUSES.has(application.status),
  )

  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Officer / Approval Queue
          </span>
          <h1>Approval Queue</h1>
          <p>
            Review applications requiring an officer decision or follow-up.
          </p>
        </div>
      </div>

      <section className="setu-content-card">
        {loading ? (
          <p aria-live="polite">Loading approval queue...</p>
        ) : error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : queue.length === 0 ? (
          <div className="setu-empty-state">
            <h2>No applications require attention</h2>
            <p>The queue is clear right now.</p>
          </div>
        ) : (
          <div className="setu-table-wrapper">
            <table className="setu-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Citizen</th>
                  <th>Scheme</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>
                        APP-{String(application.id).padStart(6, '0')}
                      </strong>
                    </td>
                    <td>{application.applicant_name || 'Citizen'}</td>
                    <td>{getJourneyLabel(application.journey_id)}</td>
                    <td><StatusBadge status={application.status} /></td>
                    <td>{formatDate(application.created_at)}</td>
                    <td>
                      <button
                        className="setu-view-button"
                        type="button"
                        onClick={() =>
                          navigate(`/officer/applications/${application.id}`)
                        }
                      >
                        Review
                      </button>
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
