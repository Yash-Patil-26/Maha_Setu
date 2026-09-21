import { CITIZEN_SERVICES } from '../fixtures/citizen'

function CitizenDashboard() {
  return (
    <main>
      <header>
        <h1>Citizen Dashboard</h1>
        <p>Select a service to begin your application.</p>
      </header>

      <section aria-label="Available services">
        {CITIZEN_SERVICES.map((service) => (
          <article key={service.journeyId}>
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
