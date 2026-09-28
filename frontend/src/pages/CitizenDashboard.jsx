import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import { useNavigate } from 'react-router-dom'

import { clearAuthSession, getAuthUser } from '../auth/storage'

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

  function handleLogout() {
    clearAuthSession()
    navigate('/login')
  }

  function goToService(journeyId) {
    navigate(`/citizen/apply/${journeyId}`)
  }

  function goToFirstService() {
    const firstJourneyId = Object.keys(SERVICE_META)[0]

    if (firstJourneyId) {
      goToService(firstJourneyId)
    }
  }

  function goToLastApplication() {
    const applicationId = localStorage.getItem(
      'last_citizen_application_id',
    )

    if (applicationId) {
      navigate(`/citizen/applications/${applicationId}`)
    }
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
    <main className="citizen-page">

      {/* TOP HEADER */}
      <header className="citizen-topbar">

        <div className="citizen-brand">
          <div className="citizen-gov-mark">
            MS
          </div>

          <div>
            <div className="citizen-gov-name">
              MahaSetu
            </div>

            <div className="citizen-gov-subtitle">
              Digital Service Prototype
            </div>
          </div>
        </div>

        <div className="citizen-logo">
          <strong>
            Maha<span>Setu</span>
          </strong>

          <small>
            Unified Platform for Government Services
          </small>
        </div>

        <div className="citizen-top-actions">

          <button
            className="citizen-language"
            type="button"
            onClick={() =>
              setLanguage((current) =>
                current === 'en' ? 'mr' : 'en',
              )
            }
            title="Change language"
          >
            {isEnglish ? 'EN | \u092e\u0930\u093e\u0920\u0940' : '\u092e\u0930\u093e\u0920\u0940 | EN'}
          </button>

          <button
            className="citizen-icon-button"
            type="button"
            aria-label="Notifications"
            title="Notifications"
          >
            &#128276;
            <span className="notification-dot" />
          </button>

          <div className="citizen-user-menu">
            <div className="citizen-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <span>{displayName}</span>

            <span className="user-chevron">
              &#9662;
            </span>
          </div>

        </div>
      </header>

      <div className="citizen-layout">

        {/* SIDEBAR */}
        <aside className="citizen-sidebar">

          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{displayName}</strong>
              <span>{text.citizen}</span>
            </div>
          </div>

          <nav className="citizen-nav">

            <button
              className="citizen-nav-item active"
              type="button"
              onClick={() => navigate('/citizen')}
            >
              <span className="citizen-nav-icon">
                &#8962;
              </span>

              <div>
                <strong>{text.dashboard}</strong>
                <small />
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={goToFirstService}
            >
              <span className="citizen-nav-icon">
                &#9633;
              </span>

              <div>
                <strong>{text.apply}</strong>
                <small />
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={goToLastApplication}
            >
              <span className="citizen-nav-icon">
                &#9776;
              </span>

              <div>
                <strong>{text.applications}</strong>
                <small />
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => navigate('/citizen/consents')}
            >
              <span className="citizen-nav-icon">
                &#9671;
              </span>

              <div>
                <strong>{text.consent}</strong>
                <small />
              </div>
            </button>

            <button
              className="citizen-nav-item"
              type="button"
              onClick={() => window.alert(
                isEnglish
                  ? 'Help & Support will be available soon.'
                  : '??? ??? ?????? ????? ?????? ????.',
              )}
            >
              <span className="citizen-nav-icon">
                ?
              </span>

              <div>
                <strong>{text.help}</strong>
                <small />
              </div>
            </button>

          </nav>

          <div className="sidebar-bottom">
            <button
              className="sidebar-logout"
              type="button"
              onClick={handleLogout}
            >
              {text.logout}
            </button>
          </div>

        </aside>

        {/* MAIN CONTENT */}
        <section className="citizen-content">

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
                  const applicationId = application.application_id

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
              onClick={goToLastApplication}
            >
              {text.viewAll} &gt;
            </button>

          </div>

          <section className="application-list">

            <article className="application-row">

              <div className="application-service-icon">
                &#9733;
              </div>

              <div className="application-info">

                <strong>
                  {text.postMatric}
                </strong>

                <span>
                  {text.scholarshipApplication}
                </span>

              </div>

              <span className="status-pill status-progress">
                {text.inProgress}
              </span>

              <span className="application-date">
                {text.updatedToday}
              </span>

              <button
                className="application-arrow"
                type="button"
                onClick={goToLastApplication}
                aria-label="Open application"
              >
                &gt;
              </button>

            </article>

            <div className="empty-application-note">
              {text.emptyApplication}
            </div>

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

          <footer className="citizen-footer">

            <div>
              <span>{text.about}</span>
              <span>{text.terms}</span>
              <span>{text.privacy}</span>
              <span>{text.help}</span>
            </div>

            <small>
              {text.digitalPrototype}
            </small>

          </footer>

        </section>

      </div>

    </main>
  )
}

export default CitizenDashboard
