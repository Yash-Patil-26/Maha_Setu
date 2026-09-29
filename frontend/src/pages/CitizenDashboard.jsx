import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import { useNavigate } from 'react-router-dom'

import { getAuthUser } from '../auth/storage'

import '../citizen-ui.css'

const SERVICE_META = {
  scholarship_v1: {
    title: 'Post-Matric Scholarship',
    marathi: 'पदव्युत्तर शिष्यवृत्ती',
    description:
      'Check eligibility and apply using consented Revenue and Education records.',
  },
  youth_enterprise_v1: {
    title: 'Youth Enterprise Support',
    marathi: 'युवा उद्योजक सहाय्य',
    description:
      'Use connected training records to support youth enterprise eligibility.',
  },
}

function CitizenDashboard() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadApplications() {
      try {
        const result = await apiRequest('/api/applications?limit=50&offset=0')
        if (active) {
          setApplications(Array.isArray(result) ? result : [])
          setError('')
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load your applications.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadApplications()

    return () => {
      active = false
    }
  }, [])

  const [language, setLanguage] = useState('en')

  const user = getAuthUser()
  const displayName = user?.display_name || user?.username || 'Citizen'

  const isEnglish = language === 'en'


  function goToService(journeyId) {
    navigate(`/citizen/apply/${journeyId}`)
  }

  function goToFirstService() {
    const firstJourneyId = Object.keys(SERVICE_META)[0]

    if (firstJourneyId) {
      goToService(firstJourneyId)
    }
  }

  function goToApplicationList() {
    document
      .getElementById('applications-heading')
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
  }

  const text = {
    dashboard: isEnglish ? 'Dashboard' : '????????',
    apply: isEnglish ? 'Apply for Schemes' : '?????????? ????',
    applications: isEnglish ? 'My Applications' : '???? ????',
    consent: isEnglish ? 'Consent & Data' : '????? ? ????',
    profile: isEnglish ? 'My Profile' : '???? ????????',
    help: isEnglish ? 'Help & Support' : '??? ? ??????',

    citizen: isEnglish ? 'Citizen' : '??????',

    citizenServices: isEnglish
      ? 'Citizen Services'
      : '?????? ????',

    greeting: isEnglish
      ? `Good Morning, ${displayName}`
      : `??? ????, ${displayName}`,

    welcomeDescription: isEnglish
      ? 'Access government services, apply for schemes and track your applications from one place.'
      : '?????? ???? ?????, ?????????? ???? ??? ??? ??????? ???????? ?????? ???? ?????? ????.',

    popularSchemes: isEnglish
      ? 'Popular Schemes'
      : '???????? ?????',

    exploreServices: isEnglish
      ? 'Explore available government services'
      : '?????? ?????? ???? ???',

    viewAll: isEnglish
      ? 'View All'
      : '???? ???',

    applyNow: isEnglish
      ? 'Apply Now'
      : '??? ???? ???',

    yourApplications: isEnglish
      ? 'Your Applications'
      : '????? ????',

    trackApplications: isEnglish
      ? 'Track the progress of your submitted applications'
      : '??????? ???? ???????? ???????? ?????? ???',

    postMatric: isEnglish
      ? 'Post Matric Scholarship'
      : '???????????? ???????????',

    scholarshipApplication: isEnglish
      ? 'Scholarship Application'
      : '??????????? ????',

    inProgress: isEnglish
      ? 'In Progress'
      : '???????????',

    updatedToday: isEnglish
      ? 'Last updated today'
      : '?? ?????? ??????',

    emptyApplication: isEnglish
      ? 'Your latest application will appear here after submission.'
      : '???? ???? ?????????? ????? ?????? ???? ???? ?????.',

    dataControl: isEnglish
      ? 'Your Data, Your Control'
      : '????? ????, ????? ????????',

    dataControlDescription: isEnglish
      ? 'You control consent for accessing your information from government departments.'
      : '?????? ??????????? ????? ?????? ???????????? ????? ???????? ???????? ?????????? ???.',

    fasterApplications: isEnglish
      ? 'Faster Applications'
      : '??? ???? ?????????',

    fasterApplicationsDescription: isEnglish
      ? 'Reduce repeated document submission with secure data sharing.'
      : '???????? ???? ??????????? ??????? ????????? ???? ???????? ??? ??? ???.',

    transparentTracking: isEnglish
      ? 'Transparent Tracking'
      : '???????? ????????',

    transparentTrackingDescription: isEnglish
      ? 'Track your application status at every stage.'
      : '???????? ????????? ??????? ??????? ?????? ???.',

    seamlessServices: isEnglish
      ? 'Seamless Services'
      : '???? ????',

    strongerMaharashtra: isEnglish
      ? 'Stronger Maharashtra'
      : '?????? ??????????',

    about: isEnglish ? 'About MahaSetu' : '??? ?????????',
    terms: isEnglish ? 'Terms of Use' : '????????? ???',
    privacy: isEnglish ? 'Privacy Policy' : '???????? ????',

    digitalPrototype: isEnglish
      ? 'MahaSetu - Digital Service Integration Prototype'
      : '??? ???? - ?????? ???? ????????? ??????????',

    logout: isEnglish ? 'Logout' : '????? ???',
  }

  return (
    <div className="setu-dashboard-page citizen-dashboard-page">
      <section className="citizen-content">

        <div className="citizen-dashboard-toolbar">
          <button
            className="setu-language-toggle"
            type="button"
            onClick={() =>
              setLanguage((current) =>
                current === 'en' ? 'mr' : 'en',
              )
            }
            title="Change language"
          >
            {isEnglish ? 'EN | मराठी' : 'मराठी | EN'}
          </button>
        </div>

          <div className="citizen-breadcrumb">
            {text.dashboard}
            <span>
              &gt;
            </span>
            {text.dashboard}
          </div>

          {/* WELCOME */}
          <section className="citizen-welcome">

            <div>
              <p className="eyebrow">
                {text.citizenServices}
              </p>

              <h1>
                {text.greeting}
              </h1>

              <p>
                {text.welcomeDescription}
              </p>
            </div>

            <div className="welcome-illustration">

              <div className="welcome-circle">
                MS
              </div>

              <span>
                {text.seamlessServices}
              </span>

              <small>
                {text.strongerMaharashtra}
              </small>

            </div>

          </section>

          {/* POPULAR SCHEMES */}
          <div className="section-heading">

            <div>
              <h2>
                {text.popularSchemes}
              </h2>

              <p>
                {text.exploreServices}
              </p>
            </div>

            <button
              className="text-link"
              type="button"
              onClick={goToFirstService}
            >
              {text.viewAll} &gt;
            </button>

          </div>

          <section className="scheme-grid">

            <section
            className="setu-content-card"
            aria-labelledby="applications-heading"
          >
            <div className="setu-card-heading">
              <div>
                <h2 id="applications-heading">My Applications</h2>
                <p>Live application status from SETU.</p>
              </div>
            </div>

            {loading && (
              <p aria-live="polite">Loading your applications…</p>
            )}

            {!loading && error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            {!loading && !error && applications.length === 0 && (
              <div className="setu-empty-state">
                <h3>No applications yet</h3>
                <p>Start a service application below.</p>
              </div>
            )}

            {!loading && !error && applications.length > 0 && (
              <div className="application-list">
                {applications.map((application) => {
                  const applicationId = application.id

                  return (
                    <article
                      className="application-list-item"
                      key={applicationId}
                    >
                      <div>
                        <p className="setu-breadcrumb">SETU Application</p>
                        <h3>Application #{applicationId}</h3>
                        <p>
                          Status:{' '}
                          <strong>{application.status || 'UNKNOWN'}</strong>
                        </p>
                        {application.correlation_id && (
                          <p>
                            Reference: {application.correlation_id}
                          </p>
                        )}
                      </div>

                      <Link
                        className="button button-secondary"
                        to={`/citizen/applications/${applicationId}`}
                      >
                        View application
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {Object.entries(SERVICE_META).map(([journeyId, service], index) => (

              <article
                className={`scheme-card scheme-card-${index + 1}`}
                key={journeyId}
              >

                <div className="scheme-icon">
                  {index === 0
                    ? 'S'
                    : index === 1
                      ? 'E'
                      : 'K'}
                </div>

                <span className="scheme-category">
                  {index === 0
                    ? isEnglish
                      ? 'Students'
                      : '??????????'
                    : index === 1
                      ? isEnglish
                        ? 'Employment'
                        : '??????'
                      : isEnglish
                        ? 'Skills'
                        : '??????'}
                </span>

                <h3>
                  {service.title}
                </h3>

                <p>
                  {service.description}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    goToService(journeyId)
                  }
                >
                  {text.applyNow} &gt;
                </button>

              </article>

            ))}

          </section>

          {/* APPLICATIONS */}
          <div className="section-heading application-heading">
            <div>
              <h2>
                {text.yourApplications}
              </h2>

              <p>
                {text.trackApplications}
              </p>
            </div>

            <button
              className="text-link"
              type="button"
              onClick={goToApplicationList}
              disabled={applications.length === 0}
            >
              {text.viewAll} &gt;
            </button>
          </div>

          <section className="application-list">
            {!loading && !error && applications.length === 0 && (
              <div className="empty-application-note">
                {text.emptyApplication}
              </div>
            )}

            {!loading && !error && applications.length > 0 && (
              applications.map((application) => {
                const service =
                  SERVICE_META[application.journey_id]

                const serviceTitle =
                  service?.title || 'Government Service'

                const applicationTitle =
                  `${serviceTitle} Application`

                const statusLabels = {
                  CREATED: 'Application started',
                  IN_PROGRESS: 'In Progress',
                  BLOCKED_CONSENT: 'Consent required',
                  PAUSED_EXCEPTION: 'Processing paused',
                  NEEDS_REVIEW: 'Needs review',
                  SUBMITTED: 'Submitted',
                  APPROVED: 'Approved',
                  REJECTED: 'Not approved',
                  NOT_ELIGIBLE: 'Not eligible',
                }

                const status =
                  statusLabels[application.status] ||
                  application.status ||
                  'Processing'

                let updatedLabel = 'Recently updated'

                if (application.updated_at) {
                  const updatedAt = new Date(
                    application.updated_at,
                  )

                  if (!Number.isNaN(updatedAt.getTime())) {
                    updatedLabel =
                      `Updated ${updatedAt.toLocaleDateString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}`
                  }
                }

                return (
                  <article
                    className="application-row"
                    key={application.id}
                  >
                    <div className="application-service-icon">
                      {serviceTitle.charAt(0)}
                    </div>

                    <div className="application-info">
                      <strong>
                        {serviceTitle}
                      </strong>

                      <span>
                        {applicationTitle}
                      </span>
                    </div>

                    <span className="status-pill status-progress">
                      {status}
                    </span>

                    <span className="application-date">
                      {updatedLabel}
                    </span>

                    <Link
                      className="application-arrow"
                      to={`/citizen/applications/${application.id}`}
                      aria-label={`Open ${applicationTitle}`}
                    >
                      &gt;
                    </Link>
                  </article>
                )
              })
            )}
          </section>

          {/* QUICK INFO */}
          <section className="citizen-info-grid">

            <article className="info-card">

              <span className="info-icon">
                &#128274;
              </span>

              <div>
                <strong>
                  {text.dataControl}
                </strong>

                <p>
                  {text.dataControlDescription}
                </p>
              </div>

            </article>

            <article className="info-card">

              <span className="info-icon">
                &#9889;
              </span>

              <div>
                <strong>
                  {text.fasterApplications}
                </strong>

                <p>
                  {text.fasterApplicationsDescription}
                </p>
              </div>

            </article>

            <article className="info-card">

              <span className="info-icon">
                &#10003;
              </span>

              <div>
                <strong>
                  {text.transparentTracking}
                </strong>

                <p>
                  {text.transparentTrackingDescription}
                </p>
              </div>

            </article>

          </section>

        </section>
    </div>
  )
}

export default CitizenDashboard
