export const JOURNEY_LABELS = {
  scholarship_v1: 'Post-Matric Scholarship',
  'SCHOL-PM': 'Post-Matric Scholarship',

  youth_enterprise_v1: 'Youth Enterprise Support',
  'STARTUP-YOUTH': 'Youth Enterprise Support',
}

export function getJourneyLabel(journeyId) {
  return (
    JOURNEY_LABELS[journeyId] ||
    String(journeyId || 'Unknown service')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}
