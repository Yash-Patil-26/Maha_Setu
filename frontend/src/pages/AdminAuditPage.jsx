import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/admin/audit')
      setLogs(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    apiRequest('/api/admin/audit')
      .then((result) => {
        if (active) {
          setLogs(Array.isArray(result) ? result : [])
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to load audit logs')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const filteredLogs =
    filter === 'All'
      ? logs
      : logs.filter((log) => log.role === filter)

  const totalEvents = logs.length

  const successfulEvents = logs.filter(
    (log) =>
      log.status === 'Success' ||
      log.status === 'Completed',
  ).length

  const systemEvents = logs.filter(
    (log) =>
      log.role === 'System' ||
      log.action.startsWith('System '),
  ).length

  const alerts = logs.filter(
    (log) =>
      log.status !== 'Success' &&
      log.status !== 'Completed',
  ).length

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Access Log
          </span>

          <h1>Access Log</h1>

          <p>
            Monitor user activity, system access and data operations.
          </p>
        </div>

        <button
          className="setu-secondary-button"
          type="button"
          onClick={loadLogs}
          disabled={loading}
        >
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </div>

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Events</span>
          <strong>{totalEvents}</strong>
          <small>Loaded audit events</small>
        </article>

        <article className="setu-stat-card">
          <span>Successful</span>
          <strong>{successfulEvents}</strong>
          <small>Completed operations</small>
        </article>

        <article className="setu-stat-card">
          <span>System Events</span>
          <strong>{systemEvents}</strong>
          <small>Automated/system operations</small>
        </article>

        <article className="setu-stat-card">
          <span>Alerts</span>
          <strong>{alerts}</strong>
          <small>Requires review</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Activity Log</h2>
            <p>Recent activity across the MahaSetu platform.</p>
          </div>

          <select
            className="setu-audit-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Government Official">
              Government Official
            </option>
            <option value="Recruiter">Recruiter</option>
            <option value="Citizen">Citizen</option>
            <option value="System">System</option>
          </select>
        </div>

        {error && (
          <div className="setu-error-message">
            {error}
          </div>
        )}

        <div className="setu-table-wrap">
          <table className="setu-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No audit events found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{log.user}</strong>
                    </td>

                    <td>{log.role}</td>
                    <td>{log.action}</td>
                    <td>{log.resource}</td>

                    <td>
                      <span className="setu-status success">
                        {log.status}
                      </span>
                    </td>

                    <td>{log.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="setu-page-footer">
        Live audit data — SETU prototype
      </footer>
    </div>
  )
}

export default AdminAuditPage
