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
      const result = await apiRequest(
        '/api/audit?limit=200&offset=0',
      )
      setLogs(
        Array.isArray(result?.items)
          ? result.items
          : [],
      )
    } catch (err) {
      setError(err.message || 'Failed to load access logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLogs()
  }, [])

  const filteredLogs =
    filter === 'All'
      ? logs
      : logs.filter((log) => log.outcome === filter)

  const allowed = logs.filter(
    (log) => log.outcome === 'ALLOWED',
  ).length

  const denied = logs.filter(
    (log) => log.outcome === 'DENIED',
  ).length

  const systems = new Set(
    logs.map((log) => log.system_code),
  ).size

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Access Log
          </span>
          <h1>Access Log</h1>
          <p>
            Review consent-based access to source-system data.
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

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Accesses</span>
          <strong>{loading ? '...' : logs.length}</strong>
          <small>Loaded access-log rows</small>
        </article>

        <article className="setu-stat-card">
          <span>Allowed</span>
          <strong>{loading ? '...' : allowed}</strong>
          <small>Successful consent checks</small>
        </article>

        <article className="setu-stat-card">
          <span>Denied</span>
          <strong>{loading ? '...' : denied}</strong>
          <small>Blocked access attempts</small>
        </article>

        <article className="setu-stat-card">
          <span>Source Systems</span>
          <strong>{loading ? '...' : systems}</strong>
          <small>Systems represented</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Activity Log</h2>
            <p>
              Every row represents an actual data-access decision.
            </p>
          </div>

          <select
            className="setu-audit-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="All">All Outcomes</option>
            <option value="ALLOWED">Allowed</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        <div className="setu-table-wrap">
          <table className="setu-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>System</th>
                <th>Purpose</th>
                <th>Fields</th>
                <th>Application</th>
                <th>Outcome</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">Loading access logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No access-log entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.at}</td>
                    <td>
                      <strong>{log.system_code}</strong>
                    </td>
                    <td>{log.purpose}</td>
                    <td>
                      {(log.fields || []).join(', ')}
                    </td>
                    <td>{log.application_id ?? '—'}</td>
                    <td>
                      <span
                        className={`setu-status ${
                          log.outcome === 'ALLOWED'
                            ? 'success'
                            : 'pending'
                        }`}
                      >
                        {log.outcome}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="setu-page-footer">
        Live access data — SETU prototype
      </footer>
    </main>
  )
}

export default AdminAuditPage
