import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client.js'

function AdminSystemsPage() {
  const [systems, setSystems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyCode, setBusyCode] = useState('')

  async function loadSystems() {
    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/systems')
      setSystems(Array.isArray(result) ? result : [])
    } catch (err) {
      setError(
        err.message || 'Unable to load connected systems.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSystems()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [])

  async function toggleOutage(system) {
    const down = !(
      system.health === 'DOWN' ||
      system.simulate_down
    )

    setBusyCode(system.code)
    setError('')

    try {
      await apiRequest(
        `/api/systems/${system.code}/simulate-outage`,
        {
          method: 'POST',
          body: JSON.stringify({ down }),
        },
      )

      await loadSystems()
    } catch (err) {
      setError(
        err.message || 'Unable to update system status.',
      )
    } finally {
      setBusyCode('')
    }
  }

  const connectedCount = systems.filter(
    (system) =>
      system.health === 'UP' &&
      !system.simulate_down,
  ).length

  const attentionCount = systems.filter(
    (system) =>
      system.health !== 'UP' ||
      system.simulate_down,
  ).length

  const systemNames = {
    REV: 'Revenue Department',
    EDU: 'Education Department',
    SKL: 'Skills & Employment Registry',
    BSS: 'Benefit Scheme Service',
  }

  const sourceFormats = {
    REV: 'XML',
    EDU: 'SQL view',
    SKL: 'CSV',
    BSS: 'JSON',
  }

  const ownerLabels = {
    REV: 'Revenue & Forest',
    EDU: 'Education',
    SKL: 'Skills & Employment',
    BSS: 'Skills / Scholarship',
  }

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Connected Systems
          </span>

          <h1>Connected Systems</h1>

          <p>
            Monitor the government systems connected to MAHA SETU
            and the information they make available.
          </p>
        </div>

        <button
          className="setu-secondary-button"
          type="button"
          onClick={() => void loadSystems()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <section className="setu-content-card">
          <p className="setu-error-message" role="alert">
            {error}
          </p>
        </section>
      )}

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Registered Systems</span>
          <strong>{loading ? '...' : systems.length}</strong>
          <small>Live system registry</small>
        </article>

        <article className="setu-stat-card">
          <span>Connected</span>
          <strong>{loading ? '...' : connectedCount}</strong>
          <small>Currently available</small>
        </article>

        <article className="setu-stat-card">
          <span>Needs Attention</span>
          <strong>{loading ? '...' : attentionCount}</strong>
          <small>Unavailable connections</small>
        </article>

        <article className="setu-stat-card">
          <span>Interoperability</span>
          <strong>SETU</strong>
          <small>Coordinates service exchange</small>
        </article>
      </section>

      <section className="setu-content-card setu-connected-systems-card">
        <div className="setu-card-heading">
          <div>
            <span className="setu-kicker">
              Live system registry
            </span>

            <h2>Government systems</h2>

            <p>
              Review availability and the type of information each
              connected system provides.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="setu-empty-state">
            Loading connected systems...
          </div>
        ) : (
          <div className="setu-connected-systems-grid">
            {systems.map((system) => {
              const isDown =
                system.health === 'DOWN' ||
                system.simulate_down

              const busy = busyCode === system.code

              return (
                <article
                  className={`setu-connected-system ${
                    isDown
                      ? 'setu-connected-system--attention'
                      : ''
                  }`}
                  key={system.code}
                >
                  <div className="setu-connected-system-header">
                    <div className="setu-system-code">
                      {system.code}
                    </div>

                    <span
                      className={`setu-status ${
                        isDown ? 'pending' : 'success'
                      }`}
                    >
                      {isDown ? 'Unavailable' : 'Connected'}
                    </span>
                  </div>

                  <div className="setu-connected-system-title">
                    <h3>
                      {systemNames[system.code] ||
                        system.name}
                    </h3>

                    <p>
                      Managed by{' '}
                      {ownerLabels[system.code] ||
                        system.owner_department}
                    </p>
                  </div>

                  <div className="setu-system-facts">
                    <div>
                      <span>Information format</span>
                      <strong>
                        {sourceFormats[system.code] ||
                          'Connected source'}
                      </strong>
                    </div>

                    <div>
                      <span>Connection</span>
                      <strong>
                        {system.protocol ||
                          'Registered connection'}
                      </strong>
                    </div>
                  </div>

                  {isDown && (
                    <div className="setu-system-attention">
                      <strong>
                        Connection requires attention
                      </strong>

                      <span>
                        This system is currently unavailable to
                        the interoperability layer.
                      </span>
                    </div>
                  )}

                  <details className="setu-technical-details">
                    <summary>
                      Technical configuration
                    </summary>

                    <div className="setu-technical-grid">
                      <div>
                        <span>System code</span>
                        <strong>{system.code}</strong>
                      </div>

                      <div>
                        <span>Authentication</span>
                        <strong>
                          {system.auth_type ||
                            'Not specified'}
                        </strong>
                      </div>

                      <div>
                        <span>Identifier scheme</span>
                        <strong>
                          {system.id_scheme ||
                            'Not specified'}
                        </strong>
                      </div>

                      <div>
                        <span>Registry health</span>
                        <strong>
                          {system.health ||
                            'Not available'}
                        </strong>
                      </div>
                    </div>
                  </details>

                  <div className="setu-connected-system-actions">
                    <button
                      className={
                        isDown
                          ? 'setu-primary-button'
                          : 'setu-secondary-button'
                      }
                      type="button"
                      onClick={() =>
                        void toggleOutage(system)
                      }
                      disabled={busy}
                    >
                      {busy
                        ? 'Updating...'
                        : isDown
                          ? 'Restore connection'
                          : 'Simulate outage'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <footer className="setu-page-footer">
        Live system registry · MAHA SETU prototype
      </footer>
    </main>
  )
}

export default AdminSystemsPage
