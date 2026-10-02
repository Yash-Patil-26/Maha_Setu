import {
  getStatusLabel,
  getStatusTone,
} from '../constants/statusLabels.js'

function StatusBadge({ status, className = '' }) {
  const tone = getStatusTone(status)
  const label = getStatusLabel(status)

  return (
    <span
      className={`setu-status-badge setu-status-badge-${tone} ${className}`.trim()}
      data-status={status || 'UNKNOWN'}
    >
      <span
        className="setu-status-badge-dot"
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}

export default StatusBadge
