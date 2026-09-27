import { useState } from 'react'
import { apiRequest } from '../api/client.js'

const steps = [
  'Select System',
  'Sample Data',
  'Suggested Mapping',
  'Test Mapping',
  'Activate Connector',
]

const DEMO_IDENTITY = {
  mobile: '9822012346',
  dob: '2002-11-12',
}

const SKL_CONFIG = {
  system_code: 'SKL',
  name_prefix: 'skl_training',
  kind: 'CSV',
  entity: 'training_record',
  config: {
    file: 'data_drop/skills_registry.csv',
    encoding: 'utf-8-sig',
    delimiter: ',',
  },
  lookup: {
    mobile_field: 'MOBILE',
    dob_field: 'DOB',
    dob_format: '%d-%m-%Y',
  },
}

const JOURNEY_ID = 'youth_enterprise_v1'
const STEP_ID = 'fetch_training'

function formatValue(value) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

function mappingSource(specification) {
  if (specification && typeof specification === 'object') {
    return specification.source || 'Derived'
  }

  return formatValue(specification)
}

export default function AdminStudioPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [connectorId, setConnectorId] = useState(null)
  const [connectorName, setConnectorName] = useState('')
  const [connectorStatus, setConnectorStatus] = useState('')

  const [sample, setSample] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [activationResult, setActivationResult] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function showError(err) {
    setError(err?.message || 'Studio operation failed.')
  }

  async function createConnector() {
    setLoading(true)
    setError('')

    try {
      const name = SKL_CONFIG.name_prefix

      const result = await apiRequest('/api/connectors', {
        method: 'POST',
        body: JSON.stringify({
          system_code: SKL_CONFIG.system_code,
          name,
          kind: SKL_CONFIG.kind,
          entity: SKL_CONFIG.entity,
          config: SKL_CONFIG.config,
          lookup: SKL_CONFIG.lookup,
          auth: {},
        }),
      })

      setConnectorId(result.id)
      setConnectorName(result.name || name)
      setConnectorStatus(result.status || 'DRAFT')
      setCurrentStep(1)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSample() {
    if (!connectorId) {
      setError('Connector has not been created yet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/sample`,
        {
          method: 'POST',
          body: JSON.stringify({
            identity_sample: DEMO_IDENTITY,
          }),
        },
      )

      setSample(result)
      setCurrentStep(2)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function generateMapping() {
    if (!connectorId) {
      setError('Connector has not been created yet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/suggest-mapping`,
        {
          method: 'POST',
        },
      )

      setMapping(result.mapping || {})
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveMapping() {
    if (!connectorId) {
      setError('Connector has not been created yet.')
      return
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      setError('No mapping has been generated.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/mapping`,
        {
          method: 'PUT',
          body: JSON.stringify({
            mapping,
            validators: [],
          }),
        },
      )

      setConnectorStatus(result.status || 'DRAFT')
      setCurrentStep(3)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function runTest() {
    if (!connectorId) {
      setError('Connector has not been created yet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({
            mapping,
            identity_sample: DEMO_IDENTITY,
          }),
        },
      )

      setTestResult(result)
      setConnectorStatus('TESTED')
      setCurrentStep(4)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function activateConnector() {
    if (!connectorId) {
      setError('Connector has not been created yet.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/activate`,
        {
          method: 'POST',
          body: JSON.stringify({
            journey_id: JOURNEY_ID,
            step_id: STEP_ID,
          }),
        },
      )

      setActivationResult(result)
      setConnectorStatus(
        result?.connector?.status || 'ACTIVE',
      )
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  function previousStep() {
    if (loading || currentStep === 0) {
      return
    }

    setError('')
    setCurrentStep((step) => Math.max(0, step - 1))
  }

  async function handlePrimaryAction() {
    if (loading) {
      return
    }

    switch (currentStep) {
      case 0:
        await createConnector()
        break
      case 1:
        await loadSample()
        break
      case 2:
        if (!mapping) {
          await generateMapping()
          return
        }

        await saveMapping()
        break
      case 3:
        await runTest()
        break
      case 4:
        if (!activationResult) {
          await activateConnector()
        }
        break
      default:
        break
    }
  }

  const mappingEntries = mapping
    ? Object.entries(mapping)
    : []

  const validationEntries = Array.isArray(
    testResult?.validation,
  )
    ? testResult.validation
    : []

  const primaryLabel = (() => {
    if (loading) {
      return 'Working...'
    }

    if (currentStep === 0) {
      return 'Create Connector'
    }

    if (currentStep === 1) {
      return 'Load Sample'
    }

    if (currentStep === 2) {
      return mapping ? 'Save Mapping' : 'Generate Mapping'
    }

    if (currentStep === 3) {
      return 'Run Test'
    }

    return activationResult
      ? 'Connector Activated'
      : 'Activate Connector'
  })()

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Onboarding Studio
          </span>

          <h1>Onboarding Studio</h1>

          <p>
            Connect and configure a government system through the real
            SETU connector lifecycle.
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Live Connector Onboarding</h2>
            <p>
              The current finale demo path on this environment is the
              SKL CSV connector for the Youth Enterprise journey.
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
                SKL is the implemented live onboarding path for this
                prototype. It uses the repository-backed skills registry.
              </p>

              <label>
                Government System
                <select value="SKL" disabled>
                  <option value="SKL">
                    SKL — Skills &amp; Employment
                  </option>
                </select>
              </label>

              <div className="setu-review-box">
                <div>
                  <span>System Code</span>
                  <strong>SKL</strong>
                </div>

                <div>
                  <span>Connector Type</span>
                  <strong>CSV</strong>
                </div>

                <div>
                  <span>Source</span>
                  <strong>data_drop/skills_registry.csv</strong>
                </div>

                <div>
                  <span>Journey</span>
                  <strong>Youth Enterprise Support</strong>
                </div>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <h3>Sample Data</h3>

              <p className="setu-form-help">
                The sample request uses the seeded synthetic identity
                and reads the actual SKL CSV through the backend connector.
              </p>

              {connectorId && (
                <div className="setu-review-box">
                  <div>
                    <span>Connector</span>
                    <strong>{connectorName}</strong>
                  </div>

                  <div>
                    <span>Connector ID</span>
                    <strong>{connectorId}</strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>{connectorStatus || 'DRAFT'}</strong>
                  </div>

                  <div>
                    <span>Demo identity</span>
                    <strong>
                      {DEMO_IDENTITY.mobile} · {DEMO_IDENTITY.dob}
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <h3>Suggested Mapping</h3>

              <p className="setu-form-help">
                These mappings are generated by the backend mapping engine
                against the sampled SKL source fields.
              </p>

              {!mapping && (
                <div className="setu-review-box">
                  <div>
                    <span>Sample status</span>
                    <strong>
                      {sample ? 'Loaded' : 'Not loaded'}
                    </strong>
                  </div>

                  <div>
                    <span>Action</span>
                    <strong>Generate mapping from source data</strong>
                  </div>
                </div>
              )}

              {sample?.raw && !mapping && (
                <div className="setu-content-card">
                  <h3>Live Source Record</h3>

                  <div className="setu-mapping-list">
                    {Object.entries(sample.raw).map(
                      ([field, value]) => (
                        <div key={field}>
                          <strong>{field}</strong>
                          <span>{formatValue(value)}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {mapping && (
                <div className="setu-mapping-list">
                  {mappingEntries.map(
                    ([target, specification]) => (
                      <div key={target}>
                        <strong>{target}</strong>
                        <span>
                          {mappingSource(specification)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <h3>Test Mapping</h3>

              <p className="setu-form-help">
                Save the mapping, then execute the connector against the
                same seeded identity. The backend validates the canonical
                record before allowing activation.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>Connector</span>
                  <strong>{connectorName}</strong>
                </div>

                <div>
                  <span>Mapped fields</span>
                  <strong>{mappingEntries.length}</strong>
                </div>

                <div>
                  <span>Validation state</span>
                  <strong>
                    {testResult ? 'Passed' : 'Ready to test'}
                  </strong>
                </div>
              </div>

              {testResult?.canonical && (
                <div className="setu-review-box">
                  <div>
                    <span>Canonical trainee ID</span>
                    <strong>
                      {formatValue(
                        testResult.canonical.trainee_id,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Canonical name</span>
                    <strong>
                      {formatValue(
                        testResult.canonical.trainee_name,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Completion status</span>
                    <strong>
                      {formatValue(
                        testResult.canonical.completion_status,
                      )}
                    </strong>
                  </div>
                </div>
              )}

              {validationEntries.length > 0 && (
                <div className="setu-mapping-list">
                  {validationEntries.map((item, index) => (
                    <div
                      key={`${item.field}-${index}`}
                    >
                      <strong>{item.field}</strong>
                      <span>
                        {item.passed ? 'PASS' : 'FAIL'} ·{' '}
                        {item.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {currentStep === 4 && (
            <>
              <h3>Activate Connector</h3>

              <p className="setu-form-help">
                Activation binds this tested connector to the
                <strong> fetch_training </strong>
                step of the active Youth Enterprise journey.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>System</span>
                  <strong>SKL</strong>
                </div>

                <div>
                  <span>Connector</span>
                  <strong>{connectorName}</strong>
                </div>

                <div>
                  <span>Test status</span>
                  <strong>
                    {testResult ? 'PASSED' : 'NOT TESTED'}
                  </strong>
                </div>

                <div>
                  <span>Journey</span>
                  <strong>{JOURNEY_ID}</strong>
                </div>

                <div>
                  <span>Journey step</span>
                  <strong>{STEP_ID}</strong>
                </div>
              </div>

              {activationResult && (
                <div className="setu-success-message">
                  ✓ Connector activated successfully. The backend
                  persisted the connector as ACTIVE and configured the
                  journey step.
                </div>
              )}

              {activationResult?.journey_version && (
                <div className="setu-review-box">
                  <div>
                    <span>Journey version</span>
                    <strong>
                      {activationResult.journey_version}
                    </strong>
                  </div>

                  {activationResult.onboarding_seconds !==
                    undefined && (
                    <div>
                      <span>Onboarding time</span>
                      <strong>
                        {activationResult.onboarding_seconds}s
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="setu-studio-actions">
            <button
              className="setu-secondary-button"
              type="button"
              onClick={previousStep}
              disabled={currentStep === 0 || loading}
            >
              Back
            </button>

            <button
              className="setu-primary-button"
              type="button"
              onClick={handlePrimaryAction}
              disabled={loading || !!activationResult}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </section>

      <footer className="setu-page-footer">
        Live connector onboarding — SETU prototype
      </footer>
    </div>
  )
}
