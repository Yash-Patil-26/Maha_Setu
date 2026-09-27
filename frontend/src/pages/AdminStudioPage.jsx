import { useEffect, useRef, useState } from 'react'

const steps = [
  'Select System',
  'Sample Data',
  'Suggested Mapping',
  'Test Mapping',
  'Activate Connector',
]

const API_BASE = 'http://127.0.0.1:8000'

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const text = await response.text()

  let data = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { detail: text }
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
      data.message ||
      `Request failed with status ${response.status}`,
    )
  }

  return data
}

function AdminStudioPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [system, setSystem] = useState('SKL')

  const [connectorId, setConnectorId] = useState(null)
  const [sampleRecords, setSampleRecords] = useState([])
  const [fields, setFields] = useState([])
  const [mappings, setMappings] = useState([])
  const [validators, setValidators] = useState([])

  const [sampled, setSampled] = useState(false)
  const [tested, setTested] = useState(false)
  const [activated, setActivated] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activationResult, setActivationResult] = useState(null)

  const startedAt = useRef(null)

  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  function changeSystem(event) {
    setSystem(event.target.value)
    setConnectorId(null)
    setSampleRecords([])
    setFields([])
    setMappings([])
    setValidators([])
    setSampled(false)
    setTested(false)
    setActivated(false)
    setActivationResult(null)
    setError('')
    setCurrentStep(0)
    startedAt.current = Date.now()
  }

  async function createConnector() {
    setLoading(true)
    setError('')

    try {
      const data = await apiRequest('/api/connectors', {
        method: 'POST',
        body: JSON.stringify({
          system_code: system,
          name: `${system.toLowerCase()}_registry`,
          kind: 'CSV',
          entity: 'trainee',
          config: {
            path: 'data_drop/skills_registry.csv',
            encoding: 'utf-8-sig',
            delimiter: ',',
          },
          lookup: {
            dob_format: 'DD-MM-YYYY',
          },
          auth: {},
        }),
      })

      const id = data.id ?? data.connector?.id

      if (!id) {
        throw new Error('Connector was created but no connector ID was returned.')
      }

      setConnectorId(id)
      setCurrentStep(1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadSample() {
    if (!connectorId) {
      setError('Create the connector first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiRequest(
        `/api/connectors/${connectorId}/sample`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      )

      setFields(data.fields || [])

      const raw = data.raw

      if (Array.isArray(raw)) {
        setSampleRecords(raw)
      } else if (raw && Array.isArray(raw.records)) {
        setSampleRecords(raw.records)
      } else {
        setSampleRecords([])
      }

      setSampled(true)
      setCurrentStep(2)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function suggestMapping() {
    if (!connectorId) {
      setError('Create the connector first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await apiRequest(
        `/api/connectors/${connectorId}/suggest-mapping`,
        {
          method: 'POST',
        },
      )

      const mappingObject = data.mapping || {}

      const mappingList = Array.isArray(mappingObject)
        ? mappingObject
        : Object.entries(mappingObject)

      setMappings(mappingList)
      setCurrentStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveMappingAndContinue() {
    if (!connectorId) {
      setError('Create the connector first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const mappingObject = Object.fromEntries(
        mappings.map(([source, target]) => [source, target]),
      )

      const data = await apiRequest(
        `/api/connectors/${connectorId}/mapping`,
        {
          method: 'PUT',
          body: JSON.stringify({
            mapping: mappingObject,
            validators,
          }),
        },
      )

      if (data.mapping) {
        const nextMapping = Array.isArray(data.mapping)
          ? data.mapping
          : Object.entries(data.mapping)

        setMappings(nextMapping)
      }

      setCurrentStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function testConnector() {
    if (!connectorId) {
      setError('Create the connector first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const mappingObject = Object.fromEntries(
        mappings.map(([source, target]) => [source, target]),
      )

      const data = await apiRequest(
        `/api/connectors/${connectorId}/test`,
        {
          method: 'POST',
          body: JSON.stringify({
            mapping: mappingObject,
            identity_sample: {},
          }),
        },
      )

      const validation = data.validation || []
      setValidators(validation)

      const passed =
        validation.length === 0 ||
        validation.every((item) => item.passed === true)

      if (!passed) {
        throw new Error('Connector validation failed. Review the validation results.')
      }

      setTested(true)
      setCurrentStep(4)
    } catch (err) {
      setTested(false)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function activateConnector() {
    if (!connectorId || !tested) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const onboardingSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAt.current) / 1000),
      )

      const data = await apiRequest(
        `/api/connectors/${connectorId}/activate`,
        {
          method: 'POST',
          body: JSON.stringify({
            journey_id: 'J2',
            step_id: 'J2-S1',
          }),
        },
      )

      setActivationResult({
        ...data,
        onboarding_seconds:
          data.onboarding_seconds ?? onboardingSeconds,
      })

      setActivated(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function nextStep() {
    if (currentStep === 0) {
      createConnector()
      return
    }

    if (currentStep === 1) {
      loadSample()
      return
    }

    if (currentStep === 2) {
      suggestMapping()
      return
    }

    if (currentStep === 3) {
      testConnector()
    }
  }

  function previousStep() {
    if (loading) return

    if (currentStep > 0) {
      setError('')
      setCurrentStep((step) => step - 1)
    }
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
          {error && (
            <div className="setu-error-message">
              {error}
            </div>
          )}

          {currentStep === 0 && (
            <>
              <h3>Select System</h3>

              <p className="setu-form-help">
                Select the system you want to onboard into MahaSetu.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>System</span>
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

              <div className="setu-studio-form">
                <label htmlFor="studio-system">
                  System
                </label>

                <select
                  id="studio-system"
                  value={system}
                  onChange={changeSystem}
                  disabled={loading}
                >
                  <option value="SKL">SKL — Skills & Employment</option>
                </select>
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
                {sampleRecords.length > 0 ? (
                  sampleRecords.map((record, index) => (
                    <div key={record.TRAINEE_ID || record.candidate_id || index}>
                      <span>
                        {record.TRAINEE_ID || record.candidate_id || 'Record'}
                      </span>

                      <strong>
                        {record.TRAINEE_NAME || record.full_name || 'Unknown'}
                      </strong>

                      <small>
                        {record.COURSE_NAME ||
                          record.skill_category ||
                          'SKL record'}
                      </small>
                    </div>
                  ))
                ) : (
                  <div>
                    <span>Connector</span>
                    <strong>Ready to sample</strong>
                  </div>
                )}
              </div>

              {sampled && (
                <div className="setu-success-message">
                  ✓ Sample loaded successfully.
                  {fields.length > 0 && ` ${fields.length} fields detected.`}
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

              {mappings.length > 0 && (
                <div className="setu-success-message">
                  ✓ Mapping suggestions received from the backend.
                </div>
              )}
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
                  <strong>
                    {tested ? 'Passed' : 'Ready to test'}
                  </strong>
                </div>
              </div>

              {tested && (
                <div className="setu-success-message">
                  ✓ Mapping test passed.
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
                  <span>Connector</span>
                  <strong>{connectorId || 'Pending'}</strong>
                </div>

                <div>
                  <span>Sample</span>
                  <strong>{sampled ? 'Loaded' : 'Pending'}</strong>
                </div>

                <div>
                  <span>Test</span>
                  <strong>{tested ? 'Passed' : 'Pending'}</strong>
                </div>
              </div>

              {activated && (
                <div className="setu-success-message">
                  ✓ Connector activated successfully. {system} is ready for
                  journey execution.
                  {activationResult?.onboarding_seconds &&
                    ` Onboarding: ${activationResult.onboarding_seconds}s.`}
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

            {currentStep < steps.length - 1 ? (
              <button
                className="setu-primary-button"
                type="button"
                onClick={
                  currentStep === 2
                    ? saveMappingAndContinue
                    : nextStep
                }
                disabled={loading}
              >
                {loading
                  ? 'Working...'
                  : currentStep === 1
                    ? 'Load Sample'
                    : currentStep === 2
                      ? 'Save Mapping'
                      : currentStep === 3
                        ? 'Run Test'
                        : 'Create Connector'}
              </button>
            ) : (
              <button
                className="setu-primary-button"
                type="button"
                onClick={activateConnector}
                disabled={activated || !sampled || !tested || loading}
              >
                {loading
                  ? 'Activating...'
                  : activated
                    ? 'Connector Activated'
                    : 'Activate Connector'}
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
