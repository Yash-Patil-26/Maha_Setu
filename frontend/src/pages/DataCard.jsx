function DataCard({ canonical, provenance }) {
  return (
    <section className="card">
      <h2>Data used</h2>

      {Object.entries(canonical).map(([section, values]) => (
        <div className="data-group" key={section}>
          <h3>{section}</h3>

          {Object.entries(values).map(([field, value]) => {
            const provenanceKey = `${section}.${field}`
            const source = provenance[provenanceKey]

            return (
              <div className="data-row" key={field}>
                <strong>{field}</strong>
                <span>{String(value)}</span>
                {source && (
                  <small>Source: {source.source_system}</small>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </section>
  )
}

export default DataCard
