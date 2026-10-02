import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { getJourneyLabel } from '../constants/journeyLabels.js'
import { getStatusLabel } from '../constants/statusLabels.js'

const DECISION_STATUSES = new Set([
  'APPROVED',
  'REJECTED',
  'NOT_ELIGIBLE',
])

export default function OfficerDecisionsPage() {
  const navigate = useNavigate()
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest('/api/applications?limit=50')
      .then((result) => {
        const items = Array.isArray(result) ? result : result.items || []
        setDecisions(
          items.filter((application) =>
            DECISION_STATUSES.has(application.status),
          ),
        )
      })
      .catch((err) => {
        setError(err.message || 'Unable to load decision history.')
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Officer / My Decisions
          </span>
          <h1>My Decisions</h1>
          <p>
            Review applications that already have a recorded decision.
          </p>
        </div>
      </div>

      <section className="setu-content-card">
        {loading ? (
          <p aria-live="polite">Loading decision history...</p>
        ) : error ? (
          <p className="form-error" role="alert">{error}</p>
        ) : decisions.length === 0 ? (
          <div className="setu-empty-state">
            <h2>No decisions recorded</h2>
            <p>Completed officer decisions will appear here.</p>
          </div>
        ) : (
          <div className="setu-table-wrapper">
            <table className="setu-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Citizen</th>
                  <th>Scheme</th>
                  <th>Decision</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {decisions.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>
                        APP-{String(application.id).padStart(6, '0')}
                      </strong>
                    </td>
                    <td>{application.applicant_name || 'Citizen'}</td>
                    <td>{getJourneyLabel(application.journey_id)}</td>
                    <td>
                      <StatusBadge status={application.status} />
                      <div className="setu-table-subtext">
                        {getStatusLabel(application.status)}
                      </div>
                    </td>
                    <td>
                      <button
                        className="setu-view-button"
                        type="button"
                        onClick={() =>
                          navigate(`/officer/applications/${application.id}`)
                        }
                      >
                        View
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
