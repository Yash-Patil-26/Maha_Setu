const STEP_LABELS = {
  fetch_income: 'Income verified',
  fetch_enrolment: 'Education record verified',
  evaluate_eligibility: 'Eligibility checked',
  submit_bss: 'Application submitted',
  await_decision: 'Decision pending',
}

const STEP_STATUS_LABELS = {
  PENDING: 'Not started',
  RUNNING: 'In progress',
  DONE: 'Completed',
  FAILED: 'Could not complete',
  WAITING: 'Waiting',
  SKIPPED: 'Not required',
}

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

function formatStep(value) {
  return STEP_LABELS[value] || humanizeToken(value)
}

function formatStatus(value) {
  return STEP_STATUS_LABELS[value] || humanizeToken(value)
}

function formatSystem(value) {
  return SYSTEM_LABELS[value] || humanizeToken(value)
}

function Timeline({ steps }) {
  if (!steps.length) {
    return (
      <div className="setu-timeline-empty">
        <p>Application progress is not available yet.</p>
      </div>
    )
  }

  return (
    <ol className="setu-timeline">
      {steps.map((step, index) => {
        const isDone = step.status === 'DONE'
        const isCurrent =
          step.status === 'RUNNING' ||
          step.status === 'WAITING'

        return (
          <li
            className={[
              'setu-timeline-item',
              isDone
                ? 'setu-timeline-item-done'
                : '',
              isCurrent
                ? 'setu-timeline-item-current'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={step.step_id || index}
          >
            <div
              className="setu-timeline-marker"
              aria-hidden="true"
            >
              {isDone ? '✓' : index + 1}
            </div>

            <div className="setu-timeline-content">
              <div className="setu-timeline-heading">
                <div>
                  <strong>
                    {formatStep(step.step_id)}
                  </strong>

                  <span>
                    {formatStatus(step.status)}
                  </span>
                </div>

                {step.output_summary && (
                  <p>
                    {step.output_summary}
                  </p>
                )}
              </div>

              <details className="setu-timeline-details">
                <summary>
                  View step details
                </summary>

                <div className="setu-timeline-detail-grid">
                  {step.system_code && (
                    <div>
                      <span>Information source</span>
                      <strong>
                        {formatSystem(
                          step.system_code,
                        )}
                      </strong>
                    </div>
                  )}

                  {step.format && (
                    <div>
                      <span>Data format</span>
                      <strong>
                        {step.format}
                      </strong>
                    </div>
                  )}

                  {step.duration_ms != null && (
                    <div>
                      <span>Processing time</span>
                      <strong>
                        {step.duration_ms} ms
                      </strong>
                    </div>
                  )}
                </div>
              </details>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default Timeline
