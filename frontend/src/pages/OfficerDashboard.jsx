import { useNavigate } from 'react-router-dom'

const applications = [
  {
    id: 'APP256001',
    name: 'Rahul Patil',
    scheme: 'Post Matric Scholarship',
    status: 'In Review',
    priority: 'High',
    date: '02 Oct 2026',
  },
  {
    id: 'APP256002',
    name: 'Sneha Sharma',
    scheme: 'Skill Development',
    status: 'Pending',
    priority: 'Medium',
    date: '02 Oct 2026',
  },
  {
    id: 'APP256003',
    name: 'Amit Shinde',
    scheme: 'Youth Enterprise',
    status: 'Pending',
    priority: 'High',
    date: '01 Oct 2026',
  },
  {
    id: 'APP256004',
    name: 'Pooja More',
    scheme: 'Post Matric Scholarship',
    status: 'Approved',
    priority: 'Low',
    date: '01 Oct 2026',
  },
]

const attentionItems = [
  {
    id: 'APP256003',
    title: 'Application requires verification',
    description: 'Eligibility document needs officer review.',
    type: 'Verification',
    priority: 'High',
  },
  {
    id: 'APP256001',
    title: 'Application approaching SLA',
    description: 'Review required before the SLA deadline.',
    type: 'SLA',
    priority: 'High',
  },
  {
    id: 'APP256005',
    title: 'Data conflict detected',
    description: 'Citizen information differs across connected systems.',
    type: 'Conflict',
    priority: 'Medium',
  },
]

const grievances = [
  {
    id: 'GRV-1021',
    citizen: 'Ramesh Jadhav',
    subject: 'Application status not updated',
    status: 'Open',
  },
  {
    id: 'GRV-1022',
    citizen: 'Kavita More',
    subject: 'Document verification delay',
    status: 'In Review',
  },
  {
    id: 'GRV-1023',
    citizen: 'Nitin Pawar',
    subject: 'Scheme eligibility query',
    status: 'Resolved',
  },
]

const outcomes = [
  {
    label: 'Approved',
    value: 3,
    description: 'Applications approved',
  },
  {
    label: 'Rejected',
    value: 1,
    description: 'Applications rejected',
  },
  {
    label: 'Pending Decision',
    value: 5,
    description: 'Awaiting decision',
  },
  {
    label: 'Under Review',
    value: 4,
    description: 'Currently processing',
  },
]

function OfficerDashboard() {
  const navigate = useNavigate()

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Home / Officer Dashboard
          </div>

          <h1>Officer Dashboard</h1>

          <p>
            Review and process citizen applications across connected
            government services.
          </p>
        </div>
      </div>

      {/* Overview */}
      <section className="setu-stat-grid">
        <article className="setu-stat-card">
          <span>Total Applications</span>
          <strong>12</strong>
          <small>All applications</small>
        </article>

        <article className="setu-stat-card">
          <span>Pending</span>
          <strong>5</strong>
          <small>Need action</small>
        </article>

        <article className="setu-stat-card">
          <span>In Review</span>
          <strong>4</strong>
          <small>Currently processing</small>
        </article>

        <article className="setu-stat-card">
          <span>Approved</span>
          <strong>3</strong>
          <small>Completed decisions</small>
        </article>
      </section>

      {/* Applications requiring attention */}
      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Applications Requiring Attention</h2>
            <p>
              Items that require officer action or review.
            </p>
          </div>

          <span className="setu-attention-count">
            {attentionItems.length} items
          </span>
        </div>

        <div className="setu-attention-grid">
          {attentionItems.map((item) => (
            <article
              className="setu-attention-card"
              key={item.id}
            >
              <div className="setu-attention-top">
                <span
                  className={`setu-priority ${item.priority.toLowerCase()}`}
                >
                  {item.priority}
                </span>

                <span className="setu-attention-type">
                  {item.type}
                </span>
              </div>

              <h3>{item.title}</h3>

              <p>{item.description}</p>

              <strong>{item.id}</strong>

              <button
                className="setu-view-button"
                type="button"
                onClick={() =>
                  navigate(`/officer/applications/${item.id}`)
                }
              >
                Review
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Approval Queue */}
      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Approval Queue</h2>
            <p>
              Applications currently waiting for officer decisions.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}          >
            View All
          </button>
        </div>

        <div className="setu-table-wrapper">
          <table className="setu-table">
            <thead>
              <tr>
                <th>Application ID</th>
                <th>Citizen</th>
                <th>Scheme</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {applications.map((application) => (
                <tr key={application.id}>
                  <td>
                    <strong>{application.id}</strong>
                  </td>

                  <td>{application.name}</td>

                  <td>{application.scheme}</td>

                  <td>
                    <span
                      className={`setu-priority ${application.priority.toLowerCase()}`}
                    >
                      {application.priority}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`setu-status ${application.status
                          .toLowerCase()
                          .replaceAll(' ', '-')
                        }`}
                    >
                      {application.status}
                    </span>
                  </td>

                  <td>{application.date}</td>

                  <td>
                    <button
                      className="setu-view-button"
                      type="button"
                      onClick={() =>
                        navigate(
                          `/officer/applications/${application.id}`,
                        )
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grievances + Outcomes */}
      <section className="setu-two-column-grid">
        <article className="setu-content-card">
          <div className="setu-section-heading">
            <div>
              <h2>Grievances</h2>
              <p>Citizen complaints requiring attention.</p>
            </div>
          </div>

          <div className="setu-grievance-list">
            {grievances.map((grievance) => (
              <div
                className="setu-grievance-item"
                key={grievance.id}
              >
                <div>
                  <strong>{grievance.id}</strong>
                  <h3>{grievance.subject}</h3>
                  <span>{grievance.citizen}</span>
                </div>

                <span className="setu-status">
                  {grievance.status}
                </span>
              </div>
            ))}
          </div>
        </article>

        <article className="setu-content-card">
          <div className="setu-section-heading">
            <div>
              <h2>Outcomes</h2>
              <p>Current application decision summary.</p>
            </div>
          </div>

          <div className="setu-outcome-grid">
            {outcomes.map((outcome) => (
              <div
                className="setu-outcome-card"
                key={outcome.label}
              >
                <span>{outcome.label}</span>
                <strong>{outcome.value}</strong>
                <small>{outcome.description}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      {/* Conflicts */}
      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Data Conflicts</h2>
            <p>
              Conflicting information detected across connected systems.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={() => navigate('/officer/conflicts')}
          >
            View Conflicts
          </button>
        </div>

        <div className="setu-conflict-summary">
          <div>
            <span>Open Conflicts</span>
            <strong>3</strong>
          </div>

          <div>
            <span>Resolved Today</span>
            <strong>7</strong>
          </div>

          <div>
            <span>Needs Verification</span>
            <strong>2</strong>
          </div>
        </div>
      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerDashboard