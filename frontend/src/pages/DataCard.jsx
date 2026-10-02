import {
  getFieldLabel,
  getSectionLabel,
  getSystemLabel,
} from '../constants/fieldLabels.js'

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
                  {getSectionLabel(section)}
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
                              {getFieldLabel(field)}
                            </strong>

                            {source?.source_system && (
                              <span>
                                Source:{' '}
                                {getSystemLabel(source.source_system)}
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
