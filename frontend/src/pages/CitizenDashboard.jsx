import { useNavigate } from 'react-router-dom'
import { CITIZEN_SERVICES } from '../fixtures/citizen'
import { clearAuthSession } from '../auth/storage'

function CitizenDashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    clearAuthSession()
    navigate('/login')
  }

  return (
    <main>
      <header className="dashboard-header">
        <div>
          <h1>Citizen Dashboard</h1>
          <p>Select a service to begin your application.</p>
        </div>

        <button
          className="dashboard-logout"
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <section className="service-grid" aria-label="Available services">
        {CITIZEN_SERVICES.map((service) => (
          <article className="service-card" key={service.journeyId}>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
            <a href={`/citizen/apply/${service.journeyId}`}>
              Apply
            </a>
          </article>
        ))}
      </section>

      <footer>Synthetic data — prototype</footer>
    </main>
  )
}

export default CitizenDashboard
