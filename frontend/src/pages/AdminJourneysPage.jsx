import { useState } from 'react'

const initialJourneys = [
  {
    id: 'JRN-001',
    name: 'Income Certificate',
    department: 'Revenue Department',
    steps: 5,
    applications: 124,
    status: 'Active',
  },
  {
    id: 'JRN-002',
    name: 'Scholarship Application',
    department: 'Education Department',
    steps: 6,
    applications: 86,
    status: 'Active',
  },
  {
    id: 'JRN-003',
    name: 'Skill Training Registration',
    department: 'Skills & Employment',
    steps: 4,
    applications: 52,
    status: 'Active',
  },
  {
    id: 'JRN-004',
    name: 'Benefit Scheme Enrollment',
    department: 'Benefit Scheme System',
    steps: 7,
    applications: 31,
    status: 'Draft',
  },
]

function AdminJourneysPage() {
  const [journeys, setJourneys] = useState(initialJourneys)
  const [selectedJourney, setSelectedJourney] = useState(null)

  function createJourney() {
    const newJourney = {
      id: `JRN-00${journeys.length + 1}`,
      name: 'New Citizen Service',
      department: 'New Department',
      steps: 1,
      applications: 0,
      status: 'Draft',
    }

    setJourneys((current) => [...current, newJourney])
    setSelectedJourney(newJourney)
  }

  function toggleStatus(id) {
    setJourneys((current) =>
      current.map((journey) =>
        journey.id === id
          ? {
              ...journey,
              status: journey.status === 'Active' ? 'Draft' : 'Active',
            }
          : journey,
      ),
    )
  }

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Journey Management
          </span>

          <h1>Journey Management</h1>

          <p>
            Configure citizen service journeys and their workflow steps.
          </p>
        </div>

        <button
          className="setu-primary-button"
          type="button"
          onClick={createJourney}
        >
          + Create Journey
        </button>
      </div>

      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Journeys</span>
          <strong>{journeys.length}</strong>
          <small>Configured services</small>
        </article>

        <article className="setu-stat-card">
          <span>Active</span>
          <strong>
            {journeys.filter((journey) => journey.status === 'Active').length}
          </strong>
          <small>Live journeys</small>
        </article>

        <article className="setu-stat-card">
          <span>Drafts</span>
          <strong>
            {journeys.filter((journey) => journey.status === 'Draft').length}
          </strong>
          <small>Under configuration</small>
        </article>

        <article className="setu-stat-card">
          <span>Applications</span>
          <strong>293</strong>
          <small>Across all journeys</small>
        </article>
      </section>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Service Journeys</h2>
            <p>
              Manage workflows connecting citizens with government services.
            </p>
          </div>
        </div>

        <div className="setu-table-wrap">
          <table className="setu-table">
            <thead>
              <tr>
                <th>Journey</th>
                <th>Department</th>
                <th>Steps</th>
                <th>Applications</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {journeys.map((journey) => (
                <tr key={journey.id}>
                  <td>
                    <strong>{journey.name}</strong>
                    <small>{journey.id}</small>
                  </td>

                  <td>{journey.department}</td>

                  <td>{journey.steps}</td>

                  <td>{journey.applications}</td>

                  <td>
                    <span
                      className={`setu-status ${
                        journey.status === 'Active'
                          ? 'success'
                          : 'pending'
                      }`}
                    >
                      {journey.status}
                    </span>
                  </td>

                  <td>
                    <button
                      className="setu-secondary-button"
                      type="button"
                      onClick={() => setSelectedJourney(journey)}
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {selectedJourney && (
        <section className="setu-content-card">
          <div className="setu-card-heading">
            <div>
              <h2>Configure Journey</h2>
              <p>
                {selectedJourney.name} · {selectedJourney.id}
              </p>
            </div>

            <button
              className="setu-secondary-button"
              type="button"
              onClick={() => setSelectedJourney(null)}
            >
              Close
            </button>
          </div>

          <div className="setu-journey-config">
            <div>
              <span>Service Name</span>
              <strong>{selectedJourney.name}</strong>
            </div>

            <div>
              <span>Department</span>
              <strong>{selectedJourney.department}</strong>
            </div>

            <div>
              <span>Workflow Steps</span>
              <strong>{selectedJourney.steps} steps</strong>
            </div>

            <div>
              <span>Current Status</span>
              <strong>{selectedJourney.status}</strong>
            </div>
          </div>

          <div className="setu-journey-steps">
            <h3>Workflow</h3>

            <div className="setu-journey-step-list">
              {Array.from(
                { length: selectedJourney.steps },
                (_, index) => (
                  <div key={index}>
                    <span>{index + 1}</span>
                    <strong>
                      {[
                        'Citizen Application',
                        'Document Verification',
                        'Department Review',
                        'Approval',
                        'Service Delivery',
                        'Final Verification',
                        'Completion',
                      ][index] || `Workflow Step ${index + 1}`}
                    </strong>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="setu-studio-actions">
            <button
              className="setu-secondary-button"
              type="button"
              onClick={() => setSelectedJourney(null)}
            >
              Cancel
            </button>

            <button
              className="setu-primary-button"
              type="button"
              onClick={() => toggleStatus(selectedJourney.id)}
            >
              {selectedJourney.status === 'Active'
                ? 'Move to Draft'
                : 'Activate Journey'}
            </button>
          </div>
        </section>
      )}

      <footer className="setu-page-footer">
        Synthetic data — SETU prototype
      </footer>
    </div>
  )
}

export default AdminJourneysPage