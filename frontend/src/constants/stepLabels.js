export const STEP_LABELS = {
  fetch_income: 'Verify income',
  fetch_caste: 'Verify caste certificate',
  fetch_enrolment: 'Verify education record',
  evaluate_eligibility: 'Check eligibility',
  submit: 'Submit application',
  submit_bss: 'Submit application',
  await_decision: 'Wait for officer decision',
}

export const STEP_DESCRIPTIONS = {
  fetch_income:
    'Check the income information already available in your government records.',
  fetch_caste:
    'Check the certificate information already available in your government records.',
  fetch_enrolment:
    'Check your education record already available through the connected department.',
  evaluate_eligibility:
    'Check whether you meet the requirements for this service.',
  submit:
    'Complete the application submission.',
  submit_bss:
    'Complete the application submission through the connected service.',
  await_decision:
    'Your application is waiting for the officer to complete the review.',
}

export const STEP_STATUS_LABELS = {
  PENDING: 'Not started',
  RUNNING: 'In progress',
  DONE: 'Completed',
  FAILED: 'Could not complete',
  WAITING: 'Waiting',
  SKIPPED: 'Not required',
}

export function getStepLabel(stepId) {
  return (
    STEP_LABELS[stepId] ||
    String(stepId || 'Unknown')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}

export function getStepStatusLabel(status) {
  return (
    STEP_STATUS_LABELS[status] ||
    String(status || 'Unknown')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}
