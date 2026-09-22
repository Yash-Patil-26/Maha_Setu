import { useParams } from 'react-router-dom'
import Timeline from './Timeline'
import DataCard from './DataCard'
import OnceOnlyMeter from './OnceOnlyMeter'
import { CITIZEN_APPLICATION_DETAIL } from '../fixtures/applicationDetail'

function CitizenApplicationPage() {
  const { id } = useParams()
  const application = {
    ...CITIZEN_APPLICATION_DETAIL,
    id,
  }

  return (
    <main>
      <header>
        <p>Citizen Dashboard / Applications</p>
        <h1>Application created</h1>
        <p>Your application has been created successfully.</p>
      </header>

      <section>
        <h2>Application ID</h2>
        <p>{application.id}</p>
      </section>

      <Timeline steps={application.steps} />

      <DataCard
        canonical={application.canonical}
        provenance={application.provenance}
      />

      <OnceOnlyMeter metrics={application.metrics} />

      <footer>Synthetic data — prototype</footer>
    </main>
  )
}

export default CitizenApplicationPage
