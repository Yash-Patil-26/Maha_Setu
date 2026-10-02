export const FIELD_LABELS = {
  annual_income_inr: 'Annual income',
  income_amount: 'Income amount',
  income_certificate_number: 'Certificate number',
  issue_date: 'Issue date',

  enrolment_id: 'Enrolment ID',
  student_name: 'Student name',
  dob: 'Date of birth',
  institution_code: 'Institution',
  course_code: 'Course',
  year_of_study: 'Year of study',

  status: 'Record status',
  last_updated: 'Last updated',
}

export const SECTION_LABELS = {
  income_certificate: 'Income information',
  education_record: 'Education information',
  training_record: 'Training information',
  applicant: 'Applicant information',
}

export const SYSTEM_LABELS = {
  REV: 'Revenue Department',
  EDU: 'Education Department',
  BSS: 'Benefit Scheme Service',
  SKL: 'Skills & Employment Registry',
}

export function humanizeLabel(value) {
  return String(value || 'Unknown')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function getFieldLabel(field) {
  return FIELD_LABELS[field] || humanizeLabel(field)
}

export function getSectionLabel(section) {
  return SECTION_LABELS[section] || humanizeLabel(section)
}

export function getSystemLabel(system) {
  return SYSTEM_LABELS[system] || humanizeLabel(system)
}
