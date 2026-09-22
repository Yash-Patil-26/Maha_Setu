function OnceOnlyMeter({ metrics }) {
  const percentage = metrics.fields_total
    ? Math.round((metrics.fields_autofilled / metrics.fields_total) * 100)
    : 0

  return (
    <section>
      <h2>Once-only completion</h2>
      <p>
        {metrics.fields_autofilled} of {metrics.fields_total} fields
        were auto-filled ({percentage}%).
      </p>
      <p>Citizen typed: {metrics.citizen_typed}</p>
      <p>Documents not uploaded: {metrics.documents_not_uploaded}</p>
    </section>
  )
}

export default OnceOnlyMeter
