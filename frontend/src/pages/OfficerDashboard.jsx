import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

const formatApplication = (application) => ({
  id: application.id,
  name: 'Citizen applicant',
  scheme: application.journey_id,
  status: application.status,
  priority: application.status === 'CREATED' ? 'High' : 'Medium',
  date: new Date(application.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }),
})
function OfficerDashboard() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true)
        setError('')

        const result = await apiRequest(
        '/api/applications?limit=50',
      )

      const items = Array.isArray(result)
        ? result
        : result.items || []

      setApplications(items.map(formatApplication))
      } catch (err) {
        setError(err.message || 'Failed to load applications')
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [])

  const attentionItems = applications
    .filter((application) => application.status === 'CREATED')
    .slice(0, 3)
    .map((application) => ({
      id: application.id,
      priority: application.priority,
      type: 'Application',
      title: `${application.name} / ${application.scheme}`,
      description: `Status: ${application.status}`,
    }))
  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Officer Dashboard
          </div>

          <h1>Officer Dashboard</h1>

          <p>
            Review and process citizen applications across connected
            government services.
          </p>
        </div>
      </div>

      {/* Overview */}
      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Applications</span>
          <strong>{applications.length}</strong>
          <small>All applications</small>
        </article>

        <article className="setu-stat-card">
          <span>Pending</span>
          <strong>{applications.filter((application) => application.status === 'CREATED').length}</strong>
          <small>Need action</small>
        </article>

        <article className="setu-stat-card">
          <span>In Review</span>
          <strong>{applications.filter((application) => application.status === 'IN_REVIEW').length}</strong>
          <small>Currently processing</small>
        </article>

        <article className="setu-stat-card">
          <span>Approved</span>
          <strong>{applications.filter((application) => application.status === 'APPROVED').length}</strong>
          <small>Completed decisions</small>
        </article>
      </section>

      {/* Applications requiring attention */}
      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Applications Requiring Attention</h2>
            <p>
              Items that require officer action or review.
            </p>
          </div>

          <span className="setu-attention-count">
            {attentionItems.length} items
          </span>
        </div>

        <div className="setu-attention-grid">
          {attentionItems.map((item) => (
            <article
              className="setu-attention-card"
              key={item.id}
            >
              <div className="setu-attention-top">
                <span
                  className={`setu-priority ${item.priority.toLowerCase()}`}
                >
                  {item.priority}
                </span>

                <span className="setu-attention-type">
                  {item.type}
                </span>
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <strong>{item.id}</strong>

              <button
                className="setu-view-button"
                type="button"
                onClick={() =>
                  navigate(`/officer/applications/${item.id}`)
                }
              >
                Review
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Approval Queue */}
      <section id="approval-queue" className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Approval Queue</h2>
            <p>
              Applications currently waiting for officer decisions.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={() => document.getElementById('approval-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}          >
            View All
          </button>
        </div>

        <div className="setu-table-wrapper">
          <table className="setu-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Citizen</th>
                <th>Scheme</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7">Loading applications...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="7">{error}</td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan="7">No applications found.</td>
                </tr>
              ) : (
                applications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <strong>APP-{String(application.id).padStart(6, '0')}</strong>
                    </td>

                    <td>{application.name}</td>

                    <td>{application.scheme}</td>

                    <td>
                      <span
                        className={`setu-priority ${application.priority.toLowerCase()}`}
                      >
                        {application.priority}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`setu-status ${application.status
                          .toLowerCase()
                          .replaceAll(' ', '-')}`}
                      >
                        {application.status}
                      </span>
                    </td>

                    <td>{application.date}</td>

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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>





      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerDashboard
