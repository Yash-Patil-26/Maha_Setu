import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import { useNavigate } from 'react-router-dom'

import { getAuthUser } from '../auth/storage'
import { SERVICE_META } from '../constants/serviceCatalog.js'
import StatusBadge from '../components/StatusBadge.jsx'

import '../citizen-ui.css'

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
    dashboard: isEnglish ? 'Dashboard' : 'डॅशबोर्ड',
    apply: isEnglish ? 'Apply for Schemes' : 'सेवा अर्ज',
    applications: isEnglish ? 'My Applications' : 'सुलभ सेवा',
    consent: isEnglish ? 'Consent & Data' : 'संमती व डेटा',
    profile: isEnglish ? 'My Profile' : 'माझे प्रोफाइल',
    help: isEnglish ? 'Help & Support' : 'मदत व सहाय्य',

    citizen: isEnglish ? 'Citizen' : 'कौशल्य',

    citizenServices: isEnglish
      ? 'Citizen Services'
      : 'नागरिक सेवा',

    greeting: isEnglish
      ? `Good Morning, ${displayName}`
      : `??? ????, ${displayName}`,

    welcomeDescription: isEnglish
      ? 'Access government services, apply for schemes and track your applications from one place.'
      : 'शासकीय सेवा मिळवा, योजनांसाठी अर्ज करा आणि तुमचे अर्ज एकाच ठिकाणी पाहा.',

    popularSchemes: isEnglish
      ? 'Popular Schemes'
      : 'लोकप्रिय योजना',

    exploreServices: isEnglish
      ? 'Explore available government services'
      : 'उपलब्ध शासकीय सेवा पहा',

    viewAll: isEnglish
      ? 'View All'
      : 'सर्व पहा',

    applyNow: isEnglish
      ? 'Apply Now'
      : 'अर्ज करा',

    yourApplications: isEnglish
      ? 'Your Applications'
      : 'तुमचे अर्ज',

    trackApplications: isEnglish
      ? 'Track the progress of your submitted applications'
      : 'सादर केलेल्या अर्जांची प्रगती पाहा',

    postMatric: isEnglish
      ? 'Post Matric Scholarship'
      : 'मॅट्रिकोत्तर शिष्यवृत्ती',

    scholarshipApplication: isEnglish
      ? 'Scholarship Application'
      : 'शिष्यवृत्ती अर्ज',

    inProgress: isEnglish
      ? 'In Progress'
      : 'प्रगतीपथावर',

    updatedToday: isEnglish
      ? 'Last updated today'
      : 'आज अद्ययावत',

    emptyApplication: isEnglish
      ? 'Your latest application will appear here after submission.'
      : 'सादर केल्यानंतर तुमचा नवीन अर्ज येथे दिसेल.',

    dataControl: isEnglish
      ? 'Your Data, Your Control'
      : 'तुमचा डेटा, तुमचे नियंत्रण',

    dataControlDescription: isEnglish
      ? 'You control consent for accessing your information from government departments.'
      : 'शासकीय विभागांकडून तुमच्या माहितीच्या प्रवेशासाठी संमती तुम्ही नियंत्रित करता.',

    fasterApplications: isEnglish
      ? 'Faster Applications'
      : 'जलद अर्ज',

    fasterApplicationsDescription: isEnglish
      ? 'Reduce repeated document submission with secure data sharing.'
      : 'सुरक्षित डेटा शेअरिंगमुळे पुन्हा पुन्हा कागदपत्रे देण्याची गरज कमी करा.',

    transparentTracking: isEnglish
      ? 'Transparent Tracking'
      : 'पारदर्शक प्रगती',

    transparentTrackingDescription: isEnglish
      ? 'Track your application status at every stage.'
      : '???????? ????????? ??????? ??????? ?????? ???.',

    seamlessServices: isEnglish
      ? 'Seamless Services'
      : 'सुलभ सेवा',

    strongerMaharashtra: isEnglish
      ? 'Stronger Maharashtra'
      : 'सक्षम महाराष्ट्र',

    about: isEnglish ? 'About MahaSetu' : 'महा सेतूबद्दल',
    terms: isEnglish ? 'Terms of Use' : 'वापराच्या अटी',
    privacy: isEnglish ? 'Privacy Policy' : 'गोपनीयता धोरण',

    digitalPrototype: isEnglish
      ? 'MahaSetu - Digital Service Integration Prototype'
      : '??? ???? - ?????? ???? ????????? ??????????',

    logout: isEnglish ? 'Logout' : 'बाहेर पडा',
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
          <div id="services-section" className="section-heading">

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
                      : 'विद्यार्थी'
                    : index === 1
                      ? isEnglish
                        ? 'Employment'
                        : 'कौशल्य'
                      : isEnglish
                        ? 'Skills'
                        : 'कौशल्य'}
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
          <div id="applications-heading" className="section-heading application-heading">
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

                    <StatusBadge
                      status={application.status}
                      className="citizen-application-status"
                    />

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
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
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
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" focusable="false"><path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" /></svg>
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
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6" /></svg>
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
