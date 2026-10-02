import { Link } from 'react-router-dom'
import { SERVICE_ENTRIES } from '../constants/serviceCatalog.js'

export default function CitizenServicesPage() {
  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Citizen / Apply for Schemes
          </span>
          <h1>Apply for Schemes</h1>
          <p>
            Choose a government service and review the information it needs
            before you continue.
          </p>
        </div>
      </div>

      <section className="setu-service-directory">
        {SERVICE_ENTRIES.map(([journeyId, service]) => (
          <article className="setu-service-directory-card" key={journeyId}>
            <span className="setu-flow-eyebrow">{service.marathi}</span>
            <h2>{service.title}</h2>
            <p>{service.description}</p>

            <div className="setu-directory-section">
              <strong>Information used</strong>
              <ul className="setu-consent-data-list">
                {service.dataCategories.map((category) => (
                  <li key={category}>{category}</li>
                ))}
              </ul>
            </div>

            <div className="setu-directory-section">
              <strong>Connected sources</strong>
              <p>{service.sources.join(' · ')}</p>
            </div>

            <Link
              className="button"
              to={`/citizen/apply/${journeyId}`}
            >
              Review &amp; apply
            </Link>
          </article>
        ))}
      </section>
    </main>
  )
}
