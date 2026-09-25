import { useState } from 'react'

const initialSystems = [
  {
    code: 'REV',
    name: 'Revenue Department',
    type: 'Government System',
    records: '12.4K',
    status: 'Connected',
    lastSync: '2 minutes ago',
  },
  {
    code: 'EDU',
    name: 'Education Department',
    type: 'Government System',
    records: '8.7K',
    status: 'Connected',
    lastSync: '5 minutes ago',
  },
  {
    code: 'SKL',
    name: 'Skills & Employment',
    type: 'Employment System',
    records: '5.2K',
    status: 'Connected',
    lastSync: '8 minutes ago',
  },
  {
    code: 'BSS',
    name: 'Benefit Scheme System',
    type: 'Scheme System',
    records: '3.1K',
    status: 'Pending',
    lastSync: 'Not synced',
  },
]

function AdminSystemsPage() {
  const [systems, setSystems] = useState(initialSystems)

  function handleConnect(code) {
    setSystems((current) =>
      current.map((system) =>
        system.code === code
          ? {
              ...system,
              status: 'Connected',
              lastSync: 'Just now',
            }
          : system,
      ),
    )
  }

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Manage Systems
          </span>

          <h1>Manage Systems</h1>

          <p>
            Connect and monitor government systems integrated with MahaSetu.
          </p>
        </div>

        <button
          className="setu-primary-button"
          type="button"
          onClick={() => alert('Add System — prototype action')}
        >
          + Add System
        </button>
      </div>

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Systems</span>
          <strong>{systems.length}</strong>
          <small>Registered systems</small>
        </article>

        <article className="setu-stat-card">
          <span>Connected</span>
          <strong>
            {systems.filter((system) => system.status === 'Connected').length}
          </strong>
          <small>Active connections</small>
        </article>

        <article className="setu-stat-card">
          <span>Pending</span>
          <strong>
            {systems.filter((system) => system.status === 'Pending').length}
          </strong>
          <small>Requires configuration</small>
        </article>

        <article className="setu-stat-card">
          <span>Data Records</span>
          <strong>29.4K</strong>
          <small>Across connected systems</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Connected Systems</h2>
            <p>
              View integration status and synchronization information.
            </p>
          </div>
        </div>

        <div className="setu-system-grid">
          {systems.map((system) => (
            <article className="setu-system-card" key={system.code}>
              <div className="setu-system-card-top">
                <div className="setu-system-icon">{system.code}</div>

                <span
                  className={`setu-status ${
                    system.status === 'Connected' ? 'success' : 'pending'
                  }`}
                >
                  {system.status}
                </span>
              </div>

              <h3>{system.name}</h3>

              <p>{system.type}</p>

              <div className="setu-system-details">
                <div>
                  <span>Records</span>
                  <strong>{system.records}</strong>
                </div>

                <div>
                  <span>Last Sync</span>
                  <strong>{system.lastSync}</strong>
                </div>
              </div>

              {system.status === 'Pending' ? (
                <button
                  className="setu-primary-button"
                  type="button"
                  onClick={() => handleConnect(system.code)}
                >
                  Connect System
                </button>
              ) : (
                <button
                  className="setu-secondary-button"
                  type="button"
                  onClick={() => alert(`${system.name} details — prototype`)}
                >
                  View Details
                </button>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="setu-page-footer">
        Synthetic data — SETU prototype
      </footer>
    </div>
  )
}

export default AdminSystemsPage