function DataCard({ canonical, provenance }) {
  return (
    <section>
      <h2>Data used</h2>

      {Object.entries(canonical).map(([section, values]) => (
        <div key={section}>
          <h3>{section}</h3>
          {Object.entries(values).map(([field, value]) => {
            const provenanceKey = `${section}.${field}`
            const source = provenance[provenanceKey]

            return (
              <p key={field}>
                <strong>{field}:</strong> {String(value)}
                {source ? ` — source: ${source.source_system}` : ''}
              </p>
            )
          })}
        </div>
      ))}
    </section>
  )
}

export default DataCard
