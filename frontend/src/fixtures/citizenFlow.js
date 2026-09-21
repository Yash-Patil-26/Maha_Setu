const CONSENT_KEY = 'setu_t091_consents'
const APPLICATION_KEY = 'setu_t091_applications'

export function saveConsent(journeyId) {
  const consents = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}')
  consents[journeyId] = {
    journeyId,
    status: 'granted',
    purpose: 'Process this citizen service application.',
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consents))
}

export function hasConsent(journeyId) {
  const consents = JSON.parse(localStorage.getItem(CONSENT_KEY) || '{}')
  return consents[journeyId]?.status === 'granted'
}

export function createFixtureApplication(journeyId) {
  const applicationId = `fixture-${journeyId}`
  const applications = JSON.parse(
    localStorage.getItem(APPLICATION_KEY) || '{}',
  )

  applications[applicationId] = {
    applicationId,
    journeyId,
    status: 'SUBMITTED',
  }

  localStorage.setItem(APPLICATION_KEY, JSON.stringify(applications))
  return applicationId
}
