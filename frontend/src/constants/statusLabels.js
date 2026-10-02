export const STATUS_LABELS = {
  CREATED: 'In progress',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',

  PAUSED_EXCEPTION: 'Needs attention',
  BLOCKED_CONSENT: 'Waiting for your permission',
  NEEDS_REVIEW: 'Under review',

  APPROVED: 'Approved',
  REJECTED: 'Not approved',
  NOT_ELIGIBLE: 'Not eligible',

  DRAFT: 'Draft',
  TESTED: 'Tested',
}

export const STATUS_TONES = {
  CREATED: 'info',
  IN_PROGRESS: 'info',
  SUBMITTED: 'info',

  PAUSED_EXCEPTION: 'warning',
  BLOCKED_CONSENT: 'warning',
  NEEDS_REVIEW: 'warning',

  APPROVED: 'success',

  REJECTED: 'danger',
  NOT_ELIGIBLE: 'danger',

  DRAFT: 'neutral',
  TESTED: 'neutral',
}

export const ATTENTION_STATUSES = new Set([
  'CREATED',
  'PAUSED_EXCEPTION',
  'BLOCKED_CONSENT',
  'NEEDS_REVIEW',
])

export function getStatusLabel(status) {
  return (
    STATUS_LABELS[status] ||
    String(status || 'Unknown')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase())
  )
}

export function getStatusTone(status) {
  return STATUS_TONES[status] || 'neutral'
}
