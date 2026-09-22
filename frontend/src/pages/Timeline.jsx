function Timeline({ steps }) {
  return (
    <ol className="timeline">
      {steps.map((step) => (
        <li className="timeline-item" key={step.step_id}>
          <div className="timeline-marker" aria-hidden="true" />

          <div className="timeline-content">
            <div className="timeline-heading">
              <strong>{step.step_id}</strong>
              <span className="status-badge">{step.status}</span>
            </div>

            <p>{step.output_summary}</p>

            {step.system_code && (
              <small>
                {step.system_code}
                {step.format ? ` · ${step.format}` : ''}
                {step.duration_ms ? ` · ${step.duration_ms} ms` : ''}
              </small>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

export default Timeline
