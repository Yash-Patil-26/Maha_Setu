import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminSystemsPage() {
  const [systems, setSystems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setLoading(true)
      const data = await apiRequest('/api/systems')
      setSystems(data)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load systems')
    } finally {
      setLoading(false)
    }
  }

  async function toggle(code, down) {
    try {
      await apiRequest(`/api/systems/${code}/simulate-outage`, {
        method: 'POST',
        body: JSON.stringify({ down }),
      })
      await load()
    } catch (err) {
      setError(err.message || 'Failed to update system')
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Manage Systems
          </span>

          <h1>Manage Systems</h1>

          <p>Live system registry and outage simulation.</p>
        </div>

        <button
          className="setu-primary-button"
          type="button"
          onClick={load}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <section className="setu-content-card">
          <p>Loading systems...</p>
        </section>
      ) : (
        <section className="setu-content-card">
          <div className="setu-card-heading">
            <div>
              <h2>Connected Systems</h2>
              <p>Live registry and system health status.</p>
            </div>
          </div>

          <div className="setu-system-grid">
            {systems.map((system) => {
              const isDown =
                system.health === 'DOWN' || system.simulate_down

              return (
                <article
                  className="setu-system-card"
                  key={system.code}
                >
                  <div className="setu-system-card-top">
                    <div className="setu-system-icon">
                      {system.code}
                    </div>

                    <span
                      className={`setu-status ${
                        isDown ? 'pending' : 'success'
                      }`}
                    >
                      {system.health}
                    </span>
                  </div>

                  <h3>{system.name}</h3>

                  <p>
                    {system.protocol} · {system.auth_type}
                  </p>

                  <p>
                    Owner: {system.owner_department}
                  </p>

                  <p>
                    ID scheme: {system.id_scheme}
                  </p>

                  <button
                    className={
                      isDown
                        ? 'setu-primary-button'
                        : 'setu-secondary-button'
                    }
                    type="button"
                    onClick={() => toggle(system.code, !isDown)}
                  >
                    {isDown ? 'Restore system' : 'Simulate outage'}
                  </button>
                </article>
              )
            })}
          </div>
        </section>
      )}

      <footer className="setu-page-footer">
        Live system registry — SETU prototype
      </footer>
    </div>
  )
}

export default AdminSystemsPage
