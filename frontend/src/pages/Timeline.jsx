function Timeline({ steps }) {
  return (
    <ol className="timeline">
      {steps.map((step) => (
        <li key={step.step_id} className="timeline-item">
          <div>
            <strong>{step.step_id}</strong>
            <p>{step.output_summary}</p>
          </div>
          <span>{step.status}</span>
        </li>
      ))}
    </ol>
  )
}

export default Timeline
