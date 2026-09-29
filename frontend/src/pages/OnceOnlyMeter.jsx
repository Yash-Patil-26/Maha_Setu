function OnceOnlyMeter({ metrics }) {
  const total = Number(metrics?.fields_total) || 0
  const reused =
    Number(metrics?.fields_autofilled) || 0
  const entered =
    Number(metrics?.citizen_typed) || 0
  const documentsNotUploaded =
    Number(metrics?.documents_not_uploaded) || 0

  const percentage = total
    ? Math.min(
        100,
        Math.round((reused / total) * 100),
      )
    : 0

  return (
    <section className="setu-application-card setu-once-only-card">
      <p className="setu-application-eyebrow">
        Faster applications
      </p>

      <h2>Information provided once</h2>

      <p>
        Your application reused information already
        available through connected government records.
      </p>

      <div className="setu-once-only-summary">
        <strong>{percentage}%</strong>

        <span>
          {reused} of {total} information fields reused
        </span>
      </div>

      <div
        className="setu-once-only-track"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="Information reused"
      >
        <div
          className="setu-once-only-fill"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <div className="setu-once-only-details">
        <span>
          You entered: {entered} fields
        </span>

        <span>
          Documents not uploaded: {documentsNotUploaded}
        </span>
      </div>
    </section>
  )
}

export default OnceOnlyMeter
