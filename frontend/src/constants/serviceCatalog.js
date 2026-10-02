export const SERVICE_META = {
  scholarship_v1: {
    title: 'Post-Matric Scholarship',
    marathi: 'मॅट्रिकोत्तर शिष्यवृत्ती',
    description:
      'Apply using connected government records for scholarship eligibility.',
    purpose: 'scholarship_eligibility',
    sources: [
      'Revenue Department',
      'Education Department',
    ],
    dataCategories: [
      'Income Certificate',
      'Caste category',
      'Education enrolment',
    ],
    information:
      'Income Certificate, caste category, and education enrolment are used only to check scholarship eligibility.',
  },
  youth_enterprise_v1: {
    title: 'Youth Enterprise Support',
    marathi: 'युवा उद्योजक सहाय्य',
    description:
      'Apply using connected training and employment information.',
    purpose: 'youth_enterprise_eligibility',
    sources: [
      'Skills & Employment Registry',
    ],
    dataCategories: [
      'Training record',
      'Employment information',
    ],
    information:
      'Training and employment information is used only to support this service journey.',
  },
}

export const SERVICE_ENTRIES = Object.entries(SERVICE_META)
