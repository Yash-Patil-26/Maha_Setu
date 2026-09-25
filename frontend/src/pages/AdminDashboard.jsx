import { useNavigate } from 'react-router-dom'

const systems = [
  {
    name: 'Revenue Department',
    code: 'REV',
    status: 'Connected',
    records: '12.4K',
  },
  {
    name: 'Education Department',
    code: 'EDU',
    status: 'Connected',
    records: '8.7K',
  },
  {
    name: 'Skills & Employment',
    code: 'SKL',
    status: 'Connected',
    records: '5.2K',
  },
  {
    name: 'Benefit Scheme System',
    code: 'BSS',
    status: 'Pending',
    records: '3.1K',
  },
]

function AdminDashboard() {
  const navigate = useNavigate()

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Admin Dashboard
          </div>

          <h1>Admin Dashboard</h1>

          <p>
            Manage connected systems, service journeys and SETU
            interoperability.
          </p>
        </div>
      </div>

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Connected Systems</span>
          <strong>4</strong>
          <small>Government systems</small>
        </article>

        <article className="setu-stat-card">
          <span>Active Journeys</span>
          <strong>8</strong>
          <small>Configured services</small>
        </article>

        <article className="setu-stat-card">
          <span>API Requests</span>
          <strong>2.8K</strong>
          <small>Last 24 hours</small>
        </article>

        <article className="setu-stat-card">
          <span>System Health</span>
          <strong>98%</strong>
          <small>All services operational</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Connected Systems</h2>
            <p>
              Monitor systems integrated with the SETU platform.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={() => navigate('/admin/systems')}
          >
            Manage Systems
          </button>
        </div>

        <div className="setu-system-grid">
          {systems.map((system) => (
            <article className="setu-system-card" key={system.code}>
              <div className="setu-system-icon">
                {system.code}
              </div>

              <div className="setu-system-info">
                <h3>{system.name}</h3>
                <p>{system.records} records</p>
              </div>

              <span
                className={`setu-status ${
                  system.status === 'Connected'
                    ? 'approved'
                    : 'pending'
                }`}
              >
                {system.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Common administration tasks.</p>
          </div>
        </div>

        <div className="setu-admin-actions">
          <button
            type="button"
            onClick={() => navigate('/admin/studio')}
          >
            <strong>Onboarding Studio</strong>
            <span>Connect and configure a new system</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/journeys')}
          >
            <strong>Journey Management</strong>
            <span>Configure citizen service journeys</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/audit')}
          >
            <strong>Access Log</strong>
            <span>Review system and data access activity</span>
          </button>
        </div>
      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default AdminDashboard