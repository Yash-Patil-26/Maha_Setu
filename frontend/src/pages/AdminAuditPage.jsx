import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client.js'

function formatAuditAction(action) {
  const labels = {
    'System Outage Simulation': 'System outage simulated',
    'System Restore': 'System connection restored',
  }

  return labels[action] || action || 'Activity'
}

function formatAuditResource(resource) {
  const labels = {
    REV: 'Revenue Department',
    EDU: 'Education Department',
    BSS: 'Benefit Scheme Service',
    SKL: 'Skills & Employment Registry',
  }

  return labels[resource] || resource || 'MAHA SETU'
}

function formatAuditStatus(status) {
  const labels = {
    Success: 'Completed',
    Completed: 'Completed',
    Failed: 'Failed',
  }

  return labels[status] || status || 'Recorded'
}

function AdminAuditPage() {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadLogs() {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/api/admin/audit')
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLogs()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  const filteredLogs = useMemo(() => {
    if (filter === 'All') {
      return logs
    }

    return logs.filter((log) => log.role === filter)
  }, [logs, filter])

  const totalEvents = logs.length

  const successfulEvents = logs.filter(
    (log) =>
      log.status === 'Success' ||
      log.status === 'Completed'
  ).length

  const systemEvents = logs.filter(
    (log) => log.role === 'System'
  ).length

  const alerts = logs.filter(
    (log) =>
      log.status !== 'Success' &&
      log.status !== 'Completed'
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
            Review recent activity across MAHA SETU and its connected
            government systems.
          </p>
        </div>

        <button
          className="setu-secondary-button"
          type="button"
          onClick={loadLogs}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {error && (
        <section className="setu-content-card">
          <p>{error}</p>
        </section>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Events</span>
          <strong>{totalEvents}</strong>
          <small>Loaded audit events</small>
        </article>

        <article className="setu-stat-card">
          <span>Successful</span>
          <strong>{successfulEvents}</strong>
          <small>Success or completed</small>
        </article>

        <article className="setu-stat-card">
          <span>System Events</span>
          <strong>{systemEvents}</strong>
          <small>Automated operations</small>
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
            <h2>Recent activity</h2>
            <p>Latest recorded actions from users and connected systems.</p>
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
            <option value="System">System</option>
            <option value="Citizen">Citizen</option>
          </select>
        </div>

        <div className="setu-table-wrap">
          <table className="setu-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Activity</th>
                <th>Connected system</th>
                <th>Result</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    Loading audit events...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
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

                    <td>
                      <strong>{formatAuditAction(log.action)}</strong>
                    </td>

                    <td>{formatAuditResource(log.resource)}</td>

                    <td>
                      <span
                        className={`setu-status ${
                          log.status === 'Success' ||
                          log.status === 'Completed'
                            ? 'success'
                            : 'pending'
                        }`}
                      >
                        {formatAuditStatus(log.status)}
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
        Live activity log · MAHA SETU prototype
      </footer>
    </div>
  )
}

export default AdminAuditPage