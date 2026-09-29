const SYSTEM_LABELS = {
  REV: 'Revenue Department',
  EDU: 'Education Department',
  BSS: 'Benefit service',
  SKL: 'Skills & Employment Registry',
}

function humanizeToken(value) {
  if (value == null || value === '') {
    return '—'
  }

  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatField(field) {
  const labels = {
    annual_income_inr: 'Annual income',
    issue_date: 'Issue date',
    income_amount: 'Income amount',
    income_certificate_number: 'Certificate number',
    enrolment_id: 'Enrolment ID',
    student_name: 'Student name',
    dob: 'Date of birth',
    institution_code: 'Institution',
    course_code: 'Course',
    year_of_study: 'Year of study',
    status: 'Record status',
    last_updated: 'Last updated',
  }

  return labels[field] || humanizeToken(field)
}

function formatSection(section) {
  const labels = {
    income_certificate: 'Income information',
    education_record: 'Education information',
    training_record: 'Training information',
    applicant: 'Applicant information',
  }

  return labels[section] || humanizeToken(section)
}

function formatSource(value) {
  return (
    SYSTEM_LABELS[value] ||
    humanizeToken(value)
  )
}

function formatValue(value) {
  if (value == null || value === '') {
    return 'Not available'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}

function DataCard({ canonical, provenance }) {
  const sections = Object.entries(canonical)

  return (
    <section className="setu-application-card setu-data-card">
      <div className="setu-application-card-heading">
        <div>
          <p className="setu-application-eyebrow">
            Information used
          </p>

          <h2>Information used for your application</h2>

          <p>
            MAHA SETU reused consented information from
            connected government departments so you did
            not need to provide the same information again.
          </p>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="setu-data-empty">
          <p>
            Information details are not available yet.
          </p>
        </div>
      ) : (
        <div className="setu-data-groups">
          {sections.map(([section, values]) => {
            const entries =
              values &&
              typeof values === 'object' &&
              !Array.isArray(values)
                ? Object.entries(values)
                : [['value', values]]

            return (
              <section
                className="setu-data-group"
                key={section}
              >
                <h3>
                  {formatSection(section)}
                </h3>

                <div className="setu-data-rows">
                  {entries.map(
                    ([field, value]) => {
                      const provenanceKey =
                        `${section}.${field}`

                      const source =
                        provenance?.[provenanceKey]

                      return (
                        <div
                          className="setu-data-row"
                          key={field}
                        >
                          <div>
                            <strong>
                              {formatField(field)}
                            </strong>

                            {source?.source_system && (
                              <span>
                                Source:{' '}
                                {formatSource(
                                  source.source_system,
                                )}
                              </span>
                            )}
                          </div>

                          <strong>
                            {formatValue(value)}
                          </strong>
                        </div>
                      )
                    },
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default DataCard
