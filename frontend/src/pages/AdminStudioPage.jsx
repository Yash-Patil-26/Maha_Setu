import { useState } from 'react'

const steps = [
  'System Information',
  'API Configuration',
  'Data Mapping',
  'Authentication',
  'Review & Connect',
]

function AdminStudioPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [systemName, setSystemName] = useState('')
  const [systemType, setSystemType] = useState('Government System')
  const [apiUrl, setApiUrl] = useState('')
  const [authType, setAuthType] = useState('API Key')
  const [connected, setConnected] = useState(false)

  function nextStep() {
    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  function handleConnect() {
    setConnected(true)
  }

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Onboarding Studio
          </span>

          <h1>Onboarding Studio</h1>

          <p>
            Configure and connect a new government system to MahaSetu.
          </p>
        </div>
      </div>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>New System Integration</h2>
            <p>Complete the steps below to configure the integration.</p>
          </div>
        </div>

        <div className="setu-studio-steps">
          {steps.map((step, index) => (
            <div
              className={`setu-studio-step ${
                index === currentStep ? 'active' : ''
              } ${index < currentStep ? 'completed' : ''}`}
              key={step}
            >
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        <div className="setu-studio-form">
          {currentStep === 0 && (
            <>
              <h3>System Information</h3>

              <label>
                System Name
                <input
                  type="text"
                  value={systemName}
                  onChange={(event) => setSystemName(event.target.value)}
                  placeholder="e.g. Education Department"
                />
              </label>

              <label>
                System Type
                <select
                  value={systemType}
                  onChange={(event) => setSystemType(event.target.value)}
                >
                  <option>Government System</option>
                  <option>Department Portal</option>
                  <option>Legacy Database</option>
                  <option>External Service</option>
                </select>
              </label>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h3>API Configuration</h3>

              <label>
                API Base URL
                <input
                  type="url"
                  value={apiUrl}
                  onChange={(event) => setApiUrl(event.target.value)}
                  placeholder="https://example.gov.in/api"
                />
              </label>

              <label>
                API Version
                <input type="text" defaultValue="v1" />
              </label>
            </>
          )}

          {currentStep === 2 && (
            <>
              <h3>Data Mapping</h3>

              <p className="setu-form-help">
                Configure how external system fields map to the MahaSetu
                common data model.
              </p>

              <div className="setu-mapping-list">
                <div>
                  <strong>citizen_id</strong>
                  <span>→ master_id</span>
                </div>

                <div>
                  <strong>full_name</strong>
                  <span>→ name</span>
                </div>

                <div>
                  <strong>mobile_number</strong>
                  <span>→ contact.mobile</span>
                </div>

                <div>
                  <strong>address</strong>
                  <span>→ address.full</span>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h3>Authentication</h3>

              <label>
                Authentication Method
                <select
                  value={authType}
                  onChange={(event) => setAuthType(event.target.value)}
                >
                  <option>API Key</option>
                  <option>OAuth 2.0</option>
                  <option>JWT</option>
                  <option>Mutual TLS</option>
                </select>
              </label>

              <label>
                Credential
                <input
                  type="password"
                  placeholder="Enter prototype credential"
                />
              </label>
            </>
          )}

          {currentStep === 4 && (
            <>
              <h3>Review & Connect</h3>

              <div className="setu-review-box">
                <div>
                  <span>System Name</span>
                  <strong>{systemName || 'Not provided'}</strong>
                </div>

                <div>
                  <span>System Type</span>
                  <strong>{systemType}</strong>
                </div>

                <div>
                  <span>API URL</span>
                  <strong>{apiUrl || 'Not provided'}</strong>
                </div>

                <div>
                  <span>Authentication</span>
                  <strong>{authType}</strong>
                </div>
              </div>

              {connected && (
                <div className="setu-success-message">
                  ✓ System connected successfully — prototype action.
                </div>
              )}
            </>
          )}

          <div className="setu-studio-actions">
            <button
              className="setu-secondary-button"
              type="button"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              Back
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                className="setu-primary-button"
                type="button"
                onClick={nextStep}
              >
                Continue
              </button>
            ) : (
              <button
                className="setu-primary-button"
                type="button"
                onClick={handleConnect}
              >
                Connect System
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="setu-page-footer">
        Synthetic configuration — SETU prototype
      </footer>
    </div>
  )
}

export default AdminStudioPage