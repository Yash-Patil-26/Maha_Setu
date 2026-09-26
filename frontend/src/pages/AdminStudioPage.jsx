import { useState } from 'react'

const steps = [
  'Select System',
  'Sample Data',
  'Suggested Mapping',
  'Test Mapping',
  'Activate Connector',
]

const sampleRecords = [
  {
    candidate_id: 'SKL-1001',
    full_name: 'Amit Patil',
    mobile_number: '9876543210',
    skill_category: 'Electrician',
    employment_status: 'Seeking Employment',
  },
  {
    candidate_id: 'SKL-1002',
    full_name: 'Priya More',
    mobile_number: '9876543211',
    skill_category: 'Healthcare',
    employment_status: 'Employed',
  },
]

const mappings = [
  ['candidate_id', 'master_id'],
  ['full_name', 'name'],
  ['mobile_number', 'contact.mobile'],
  ['skill_category', 'skills.category'],
  ['employment_status', 'employment.status'],
]

function AdminStudioPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [system, setSystem] = useState('SKL')
  const [sampled, setSampled] = useState(false)
  const [tested, setTested] = useState(false)
  const [activated, setActivated] = useState(false)

  function nextStep() {
    if (currentStep === 1) {
      setSampled(true)
    }

    if (currentStep === 3) {
      setTested(true)
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((step) => step + 1)
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      setCurrentStep((step) => step - 1)
    }
  }

  function activateConnector() {
    setActivated(true)
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
            Connect and configure a government system without writing code.
          </p>
        </div>
      </div>

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Connector Onboarding</h2>
            <p>
              Sample data, review suggested mappings, test the connection, and
              activate the connector.
            </p>
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
              <h3>Select System</h3>

              <p className="setu-form-help">
                Select the system you want to onboard into MahaSetu.
              </p>

              <label>
                Government System
                <select
                  value={system}
                  onChange={(event) => setSystem(event.target.value)}
                >
                  <option value="SKL">SKL — Skills & Employment</option>
                  <option value="REV">REV — Revenue Department</option>
                  <option value="EDU">EDU — Education Department</option>
                  <option value="BSS">BSS — Benefit Scheme System</option>
                </select>
              </label>

              <div className="setu-review-box">
                <div>
                  <span>System Code</span>
                  <strong>{system}</strong>
                </div>

                <div>
                  <span>Integration Type</span>
                  <strong>Government Connector</strong>
                </div>

                <div>
                  <span>Configuration</span>
                  <strong>No code required</strong>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h3>Sample Data</h3>

              <p className="setu-form-help">
                Preview sample records received from the selected system.
              </p>

              <div className="setu-review-box">
                {sampleRecords.map((record) => (
                  <div key={record.candidate_id}>
                    <span>{record.candidate_id}</span>
                    <strong>{record.full_name}</strong>
                    <small>
                      {record.skill_category} · {record.employment_status}
                    </small>
                  </div>
                ))}
              </div>

              {sampled && (
                <div className="setu-success-message">
                  ✓ Sample loaded successfully.
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <h3>Suggested Mapping</h3>

              <p className="setu-form-help">
                Review the suggested mapping between the external system and
                the MahaSetu common data model.
              </p>

              <div className="setu-mapping-list">
                {mappings.map(([source, target]) => (
                  <div key={source}>
                    <strong>{source}</strong>
                    <span>→ {target}</span>
                  </div>
                ))}
              </div>

              <div className="setu-success-message">
                ✓ Mapping suggestions generated automatically.
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <h3>Test Mapping</h3>

              <p className="setu-form-help">
                Validate the suggested mapping against the sampled records
                before activation.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>Source records</span>
                  <strong>{sampleRecords.length}</strong>
                </div>

                <div>
                  <span>Mapped fields</span>
                  <strong>{mappings.length}</strong>
                </div>

                <div>
                  <span>Validation</span>
                  <strong>Ready to test</strong>
                </div>
              </div>

              {tested && (
                <div className="setu-success-message">
                  ✓ Mapping test passed. All required fields are compatible.
                </div>
              )}
            </>
          )}

          {currentStep === 4 && (
            <>
              <h3>Activate Connector</h3>

              <p className="setu-form-help">
                Review the configuration and activate the connector for
                journey execution.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>System</span>
                  <strong>{system}</strong>
                </div>

                <div>
                  <span>Sample</span>
                  <strong>Loaded</strong>
                </div>

                <div>
                  <span>Mapping</span>
                  <strong>Validated</strong>
                </div>

                <div>
                  <span>Test</span>
                  <strong>Passed</strong>
                </div>
              </div>

              {activated && (
                <div className="setu-success-message">
                  ✓ Connector activated successfully. {system} is ready for
                  journey execution.
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
                {currentStep === 1
                  ? 'Load Sample'
                  : currentStep === 3
                    ? 'Run Test'
                    : 'Continue'}
              </button>
            ) : (
              <button
                className="setu-primary-button"
                type="button"
                onClick={activateConnector}
                disabled={activated}
              >
                {activated ? 'Connector Activated' : 'Activate Connector'}
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="setu-page-footer">
        Connector onboarding — SETU prototype
      </footer>
    </div>
  )
}

export default AdminStudioPage