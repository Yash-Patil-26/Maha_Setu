import { useParams } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { CITIZEN_APPLICATION_DETAIL } from '../fixtures/applicationDetail'

function CitizenApplicationPage() {
  const { id } = useParams()
  const application = { ...CITIZEN_APPLICATION_DETAIL, id }

  return (
    <main>
      <header className="page-header">
        <p>Citizen Dashboard / Applications</p>
        <h1>Application created</h1>
        <p>Your application has been created successfully.</p>
      </header>

      <section className="card application-summary">
        <div>
          <span className="status-badge">{application.status}</span>
          <h2>Application ID</h2>
          <p className="application-id">{application.id}</p>
        </div>
      </section>

      <section className="card">
        <h2>Application progress</h2>
        <Timeline steps={application.steps} />
      </section>

      <DataCard
        canonical={application.canonical}
        provenance={application.provenance}
      />

      <OnceOnlyMeter metrics={application.metrics} />

      <footer className="page-footer">
        Synthetic data — prototype
      </footer>
    </main>
  )
}

export default CitizenApplicationPage
