import { useNavigate, useParams } from 'react-router-dom'

const applicationData = {
  APP256001: {
    name: 'Rahul Patil',
    scheme: 'Post Matric Scholarship',
    status: 'In Review',
    submitted: '02 Oct 2026',
    category: 'OBC',
    income: '₹2,40,000',
    education: 'B.Tech',
    district: 'Chhatrapati Sambhajinagar',
  },
  APP256002: {
    name: 'Sneha Sharma',
    scheme: 'Skill Development',
    status: 'Pending',
    submitted: '02 Oct 2026',
    category: 'General',
    income: '₹3,10,000',
    education: 'B.Sc',
    district: 'Pune',
  },
  APP256003: {
    name: 'Amit Shinde',
    scheme: 'Youth Enterprise',
    status: 'Pending',
    submitted: '01 Oct 2026',
    category: 'OBC',
    income: '₹2,80,000',
    education: 'Diploma',
    district: 'Nashik',
  },
  APP256004: {
    name: 'Pooja More',
    scheme: 'Post Matric Scholarship',
    status: 'Approved',
    submitted: '01 Oct 2026',
    category: 'SC',
    income: '₹1,90,000',
    education: 'B.Tech',
    district: 'Nagpur',
  },
}

function OfficerApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const application = applicationData[id] || {
    name: 'Citizen',
    scheme: 'Government Scheme',
    status: 'Pending',
    submitted: 'Not available',
    category: 'Not available',
    income: 'Not available',
    education: 'Not available',
    district: 'Not available',
  }

  function handleDecision(decision) {
    alert(`Application ${id} marked as ${decision}.`)
  }

  return (
    <main className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <div className="setu-breadcrumb">
            Officer Dashboard / Applications / {id}
          </div>

          <h1>Application Details</h1>

          <p>
            Review citizen information and make an application decision.
          </p>
        </div>

        <button
          className="button button-secondary"
          type="button"
          onClick={() => navigate('/officer')}
        >
          ← Back to Applications
        </button>
      </div>

      <section className="setu-content-card">
        <div className="setu-application-heading">
          <div>
            <span className="setu-label">Application ID</span>
            <h2>{id}</h2>
          </div>

          <span
            className={`setu-status ${
              application.status.toLowerCase().replaceAll(' ', '-')
            }`}
          >
            {application.status}
          </span>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Citizen Information</h2>
            <p>Information available through SETU data access.</p>
          </div>
        </div>

        <div className="setu-detail-grid">
          <div>
            <span>Full Name</span>
            <strong>{application.name}</strong>
          </div>

          <div>
            <span>Scheme</span>
            <strong>{application.scheme}</strong>
          </div>

          <div>
            <span>Category</span>
            <strong>{application.category}</strong>
          </div>

          <div>
            <span>Annual Family Income</span>
            <strong>{application.income}</strong>
          </div>

          <div>
            <span>Education</span>
            <strong>{application.education}</strong>
          </div>

          <div>
            <span>District</span>
            <strong>{application.district}</strong>
          </div>

          <div>
            <span>Submitted On</span>
            <strong>{application.submitted}</strong>
          </div>

          <div>
            <span>Data Source</span>
            <strong>SETU Connected Systems</strong>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Data &amp; Verification</h2>
            <p>Review information used during application processing.</p>
          </div>
        </div>

        <div className="setu-verification-list">
          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Identity Information</strong>
              <small>Verified from connected identity system</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>

          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Income Certificate</strong>
              <small>Retrieved with citizen consent</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>

          <div>
            <span className="setu-check">✓</span>
            <div>
              <strong>Education Details</strong>
              <small>Available from education department</small>
            </div>
            <span className="setu-status approved">Verified</span>
          </div>
        </div>
      </section>

      <section className="setu-content-card">
        <div className="setu-section-heading">
          <div>
            <h2>Officer Decision</h2>
            <p>Record a decision for this application.</p>
          </div>
        </div>

        <div className="setu-decision-actions">
          <button
            className="setu-approve-button"
            type="button"
            onClick={() => handleDecision('Approved')}
          >
            ✓ Approve Application
          </button>

          <button
            className="setu-review-button"
            type="button"
            onClick={() => handleDecision('Request Review')}
          >
            ↻ Request Review
          </button>

          <button
            className="setu-reject-button"
            type="button"
            onClick={() => handleDecision('Rejected')}
          >
            ✕ Reject Application
          </button>
        </div>
      </section>

      <footer className="page-footer">
        Synthetic data — SETU prototype
      </footer>
    </main>
  )
}

export default OfficerApplicationPage