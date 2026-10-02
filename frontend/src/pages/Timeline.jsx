import {
  getStepLabel,
  getStepStatusLabel,
} from '../constants/stepLabels.js'
import { getSystemLabel } from '../constants/fieldLabels.js'

function formatStep(value) {
  return getStepLabel(value)
}

function formatStatus(value) {
  return getStepStatusLabel(value)
}

function formatSystem(value) {
  return getSystemLabel(value)
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
              {isDone ? (
                <svg
                  viewBox="0 0 20 20"
                  width="15"
                  height="15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="m4 10 4 4 8-8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
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
