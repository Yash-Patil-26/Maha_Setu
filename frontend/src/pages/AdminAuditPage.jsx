import { useState } from 'react'

const initialLogs = [
  {
    id: 1,
    user: 'Admin User',
    role: 'Administrator',
    action: 'System Configuration',
    resource: 'Revenue Department',
    status: 'Success',
    time: '2 minutes ago',
  },
  {
    id: 2,
    user: 'Vikas Shejul',
    role: 'Administrator',
    action: 'Login',
    resource: 'Admin Portal',
    status: 'Success',
    time: '8 minutes ago',
  },
  {
    id: 3,
    user: 'Officer User',
    role: 'Government Official',
    action: 'Application Approved',
    resource: 'APP-1042',
    status: 'Success',
    time: '15 minutes ago',
  },
  {
    id: 4,
    user: 'Recruiter User',
    role: 'Recruiter',
    action: 'Candidate Search',
    resource: 'CAN-001',
    status: 'Success',
    time: '24 minutes ago',
  },
  {
    id: 5,
    user: 'System',
    role: 'System',
    action: 'Data Synchronization',
    resource: 'Education Department',
    status: 'Completed',
    time: '32 minutes ago',
  },
]

function AdminAuditPage() {
  const [logs, setLogs] = useState(initialLogs)
  const [filter, setFilter] = useState('All')

  const filteredLogs =
    filter === 'All'
      ? logs
      : logs.filter((log) => log.role === filter)

  function refreshLogs() {
    setLogs((current) => [...current])
  }

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
          onClick={refreshLogs}
        >
          ↻ Refresh
        </button>
      </div>

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Events</span>
          <strong>1,284</strong>
          <small>Last 24 hours</small>
        </article>

        <article className="setu-stat-card">
          <span>Successful</span>
          <strong>1,261</strong>
          <small>98.2% of events</small>
        </article>

        <article className="setu-stat-card">
          <span>System Events</span>
          <strong>342</strong>
          <small>Automated operations</small>
        </article>

        <article className="setu-stat-card">
          <span>Alerts</span>
          <strong>23</strong>
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
            <option value="System">System</option>
          </select>
        </div>

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
              {filteredLogs.map((log) => (
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="setu-page-footer">
        Synthetic data — SETU prototype
      </footer>
    </div>
  )
}

export default AdminAuditPage