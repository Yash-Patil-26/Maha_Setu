import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminSystemsPage() {
  const [systems, setSystems] = useState([])
  const [error, setError] = useState('')

  async function load() {
    try {
      const result = await apiRequest(
        '/api/systems',
      )

      setSystems(result)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function toggle(code, down) {
    try {
      await apiRequest(
        `/api/systems/${code}/simulate-outage`,
        {
          method: 'POST',
          body: JSON.stringify({
            down,
          }),
        },
      )

      await load()
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
  }, [])

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Manage Systems
          </span>

          <h1>Manage Systems</h1>

          <p>
            Live system registry and outage control.
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

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <section className="setu-system-grid">
        {systems.map((system) => (
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
                  system.health === 'UP'
                    ? 'success'
                    : 'pending'
                }`}
              >
                {system.health}
              </span>
            </div>

            <h3>{system.name}</h3>

            <p>
              {system.protocol} ·{' '}
              {system.auth_type}
            </p>

            <p>
              ID scheme: {system.id_scheme}
            </p>

            <button
              className={
                system.simulate_down
                  ? 'setu-primary-button'
                  : 'setu-secondary-button'
              }
              type="button"
              onClick={() =>
                toggle(
                  system.code,
                  !system.simulate_down,
                )
              }
            >
              {system.simulate_down
                ? 'Restore system'
                : 'Simulate outage'}
            </button>
          </article>
        ))}
      </section>

      <footer className="setu-page-footer">
        Synthetic data — SETU prototype
      </footer>
    </div>
  )
}

export default AdminSystemsPage
