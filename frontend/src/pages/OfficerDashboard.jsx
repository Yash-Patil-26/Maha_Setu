import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'

function OfficerDashboard() {
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const result = await apiRequest(
        '/api/applications?limit=50',
      )

      const items = Array.isArray(result)
        ? result
        : result.items || []

      setApplications(items)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    // The load function performs asynchronous API synchronization.
    // Keep the initial invocation outside the synchronous effect body.
    window.setTimeout(() => {
      void load();
    }, 0)

    const timer = window.setInterval(
      load,
      3000,
    )

    return () =>
      window.clearInterval(timer)
  }, [])

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Officer Dashboard
          </div>

          <h1>Officer Dashboard</h1>

          <p>
            Live applications from the SETU hub.
          </p>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Application Queue</h2>

            <p>
              {applications.length}{' '}
              application(s) returned by the backend.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={load}
          >
            Refresh
          </button>
        </div>

        <div className="setu-table-wrapper">
          <table className="setu-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Master ID</th>
                <th>Journey</th>
                <th>Status</th>
                <th>Outcome</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>
                      {application.id}
                    </strong>
                  </td>

                  <td>
                    {application.master_id}
                  </td>

                  <td>
                    {application.journey_id}
                  </td>

                  <td>
                    {application.status}
                  </td>

                  <td>
                    {application.outcome || '—'}
                  </td>

                  <td>
                    <button
                      className="setu-view-button"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/officer/applications/${application.id}`,
                        )
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
      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerDashboard
