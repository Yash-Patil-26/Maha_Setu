function OnceOnlyMeter({ metrics }) {
  const percentage = metrics.fields_total
    ? Math.round((metrics.fields_autofilled / metrics.fields_total) * 100)
    : 0

  return (
    <section className="card">
      <h2>Once-only completion</h2>

      <div className="meter-header">
        <strong>{percentage}%</strong>
        <span>{metrics.fields_autofilled} of {metrics.fields_total} fields</span>
      </div>

      <div
        className="meter-track"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Once-only completion"
      >
        <div
          className="meter-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="meter-details">
        <span>Citizen typed: {metrics.citizen_typed}</span>
        <span>Documents not uploaded: {metrics.documents_not_uploaded}</span>
      </div>
    </section>
  )
}

export default OnceOnlyMeter
