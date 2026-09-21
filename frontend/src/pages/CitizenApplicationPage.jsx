import { useParams } from 'react-router-dom'

function CitizenApplicationPage() {
  const { id } = useParams()

  return (
    <main>
      <header>
        <p>Citizen Dashboard / Applications</p>
        <h1>Application submitted</h1>
        <p>Your application has been created successfully.</p>
      </header>

      <section>
        <h2>Application ID</h2>
        <p>{id}</p>
      </section>

      <section>
        <h2>Timeline</h2>
        <p>Your application timeline will appear here.</p>
      </section>

      <footer>Synthetic data — prototype</footer>
    </main>
  )
}

export default CitizenApplicationPage
