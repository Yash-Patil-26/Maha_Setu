import { Link } from 'react-router-dom'

export default function CitizenHelpPage() {
  return (
    <main className="setu-dashboard-page setu-directory-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">Citizen / Help &amp; Support</span>
          <h1>Help &amp; Support</h1>
          <p>
            Simple guidance for applying, tracking an application, and
            controlling access to your information.
          </p>
        </div>
      </div>

      <section className="setu-service-directory">
        <article className="setu-service-directory-card">
          <h2>Applying for a service</h2>
          <p>
            Choose a scheme, review the information requested, give permission,
            and then start the application.
          </p>
          <Link className="button button-secondary" to="/citizen/apply">
            Browse schemes
          </Link>
        </article>

        <article className="setu-service-directory-card">
          <h2>Tracking your application</h2>
          <p>
            Open My Applications to see the latest status and journey stages.
          </p>
          <Link className="button button-secondary" to="/citizen/applications">
            View applications
          </Link>
        </article>

        <article className="setu-service-directory-card">
          <h2>Controlling your data</h2>
          <p>
            Review active permissions and see when connected departments
            accessed information for your applications.
          </p>
          <Link className="button button-secondary" to="/citizen/consents">
            Open Consent &amp; Data
          </Link>
        </article>
      </section>
    </main>
  )
}
