import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../api/client.js'

const STEPS = [
  'Choose System',
  'Load Source Sample',
  'Review Data Mapping',
  'Test Connection',
  'Activate Connection',
]

const DEMO_IDENTITY = {
  mobile: '9822012346',
  dob: '2002-11-12',
}

const SKL_CONFIG = {
  system_code: 'SKL',
  name: 'skl_training',
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
  auth: {},
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

function mappingTransform(specification) {
  if (!specification || typeof specification !== 'object') {
    return 'Direct'
  }

  const transform = specification.transform

  if (!transform) {
    return 'Direct'
  }

  if (typeof transform === 'string') {
    return transform
  }

  if (transform.date) {
    return `Date: ${transform.date}`
  }

  if (transform.enum) {
    return 'Enum transform'
  }

  return 'Transform'
}

function formatConnectorStatus(status) {
  const labels = {
    DRAFT: 'Setup in progress',
    TESTED: 'Ready to activate',
    ACTIVE: 'Connected',
  }

  return labels[status] || status || ''
}

function AdminStudioPage() {
  const [systems, setSystems] = useState([])
  const [journeyStep, setJourneyStep] = useState(null)

  const [systemCode, setSystemCode] = useState(
    SKL_CONFIG.system_code,
  )

  const [currentStep, setCurrentStep] = useState(0)

  const [connectorId, setConnectorId] = useState(null)
  const [connectorName, setConnectorName] = useState('')
  const [connectorStatus, setConnectorStatus] = useState('')

  const [sample, setSample] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [activationResult, setActivationResult] = useState(null)

  const [loadingContext, setLoadingContext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      apiRequest('/api/systems'),
      apiRequest('/api/journeys'),
    ])
      .then(([systemsData, journeysData]) => {
        if (cancelled) return

        const systemList = Array.isArray(systemsData)
          ? systemsData
          : []

        const journeyList = Array.isArray(journeysData)
          ? journeysData
          : []

        setSystems(systemList)

        const targetJourney = journeyList.find(
          (journey) => journey.id === JOURNEY_ID,
        )

        const targetStep =
          targetJourney?.steps?.find(
            (step) => step.id === STEP_ID,
          ) || null

        setJourneyStep(targetStep)
      })
      .catch((err) => {
        if (cancelled) return

        setError(
          err.message || 'Unable to load Studio configuration.',
        )
      })
      .finally(() => {
        if (cancelled) return
        setLoadingContext(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const selectedSystem = useMemo(
    () =>
      systems.find(
        (system) => system.code === systemCode,
      ) || null,
    [systems, systemCode],
  )

  const supportedSystem =
    systemCode === SKL_CONFIG.system_code

  const journeyConnectorMatches =
    journeyStep?.connector === SKL_CONFIG.name

  function showError(err) {
    setError(
      err?.message ||
        'Studio operation failed. Please review the current step.',
    )
  }

  async function createConnector() {
    if (connectorId) {
      setCurrentStep(1)
      return
    }

    if (!supportedSystem) {
      setError(
        'This onboarding template is currently configured for the SKL system.',
      )
      return
    }

    if (!journeyConnectorMatches) {
      setError(
        'The live youth enterprise journey is not currently linked to the expected SKL connector.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest('/api/connectors', {
        method: 'POST',
        body: JSON.stringify({
          system_code: SKL_CONFIG.system_code,
          name: SKL_CONFIG.name,
          kind: SKL_CONFIG.kind,
          entity: SKL_CONFIG.entity,
          config: SKL_CONFIG.config,
          lookup: SKL_CONFIG.lookup,
          auth: SKL_CONFIG.auth,
        }),
      })

      setConnectorId(result.id)
      setConnectorName(
        result.name || SKL_CONFIG.name,
      )
      setConnectorStatus(
        result.status || 'DRAFT',
      )
      setCurrentStep(1)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadSample() {
    if (!connectorId) {
      setError('Create the connector before loading a sample.')
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
      setError('Create the connector before generating a mapping.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await apiRequest(
        `/api/connectors/${connectorId}/suggest-mapping`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      )

      const suggestedMapping = result?.mapping

      if (
        !suggestedMapping ||
        typeof suggestedMapping !== 'object' ||
        Object.keys(suggestedMapping).length === 0
      ) {
        throw new Error(
          'The connector returned no suggested mapping.',
        )
      }

      await apiRequest(
        `/api/connectors/${connectorId}/mapping`,
        {
          method: 'PUT',
          body: JSON.stringify({
            mapping: suggestedMapping,
            validators: [],
          }),
        },
      )

      setMapping(suggestedMapping)
      setConnectorStatus('DRAFT')
      setCurrentStep(3)
    } catch (err) {
      showError(err)
    } finally {
      setLoading(false)
    }
  }

  async function testMapping() {
    if (!connectorId || !mapping) {
      setError(
        'Generate and save the mapping before testing it.',
      )
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

      const validations = Array.isArray(
        result?.validation,
      )
        ? result.validation
        : []

      const allPassed = validations.every(
        (item) => item?.passed !== false,
      )

      if (!allPassed) {
        throw new Error(
          'Connector mapping validation did not pass.',
        )
      }

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
    if (!connectorId || !testResult) {
      setError(
        'Complete the connector test before activation.',
      )
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
    if (loading) return

    setError('')

    setCurrentStep((step) =>
      step > 0 ? step - 1 : step,
    )
  }

  function primaryAction() {
    if (currentStep === 0) {
      void createConnector()
      return
    }

    if (currentStep === 1) {
      void loadSample()
      return
    }

    if (currentStep === 2) {
      void generateMapping()
      return
    }

    if (currentStep === 3) {
      void testMapping()
      return
    }

    if (currentStep === 4) {
      void activateConnector()
    }
  }

  const primaryLabel = {
    0: connectorId
      ? 'Continue to Sample'
      : 'Create Connector',
    1: 'Load Real Sample',
    2: mapping
      ? 'Continue to Test'
      : 'Generate & Save Mapping',
    3: testResult
      ? 'Continue to Activation'
      : 'Run Connector Test',
    4: activationResult
      ? 'Connector Activated'
      : 'Activate Connector',
  }[currentStep]

  return (
    <div className="setu-dashboard-page">
      <div className="setu-page-heading">
        <div>
          <span className="setu-breadcrumb">
            Home / Admin / Onboarding Studio
          </span>

          <h1>Onboarding Studio</h1>

          <p>
            Connect and configure a government system through
            a real, traceable interoperability workflow.
          </p>
        </div>

        {connectorStatus && (
          <span
            className={`setu-status ${
              connectorStatus === 'ACTIVE' ||
              connectorStatus === 'TESTED'
                ? 'success'
                : 'pending'
            }`}
          >
            {formatConnectorStatus(connectorStatus)}
          </span>
        )}
      </div>

      {error && (
        <section className="setu-content-card">
          <p className="form-error" role="alert">
            {error}
          </p>
        </section>
      )}

      <section className="setu-content-card">
        <div className="setu-card-heading">
          <div>
            <h2>Connect a government system</h2>

            <p>
              Follow the live onboarding workflow from source sample
              through mapping validation and activation.
            </p>
          </div>
        </div>

        <div className="setu-studio-steps">
          {STEPS.map((step, index) => (
            <div
              className={`setu-studio-step ${
                index === currentStep ? 'active' : ''
              } ${
                index < currentStep ? 'completed' : ''
              }`}
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
              <h3>Choose connected system</h3>

              <p className="setu-form-help">
                Select the government source that will provide
                information for the Youth Enterprise Support service.
                This demo currently onboards the Skills & Employment Registry.
              </p>

              <label>
                Government system
                <select
                  value={systemCode}
                  onChange={(event) =>
                    setSystemCode(event.target.value)
                  }
                  disabled={
                    loadingContext ||
                    Boolean(connectorId)
                  }
                >
                  {systems
                    .filter(
                      (system) =>
                        system.code ===
                        SKL_CONFIG.system_code,
                    )
                    .map((system) => (
                      <option
                        key={system.code}
                        value={system.code}
                      >
                        {system.name} ({system.code})
                      </option>
                    ))}
                </select>
              </label>

              <div className="setu-review-box">
                <div>
                  <span>Connected system</span>
                  <strong>
                    {selectedSystem?.name ||
                      SKL_CONFIG.system_code}
                  </strong>
                </div>

                <div>
                  <span>Source format</span>
                  <strong>
                    {selectedSystem?.protocol || 'CSV'}
                  </strong>
                </div>

                <div>
                  <span>Connected source</span>
                  <strong>
                    Skills &amp; Employment Registry
                  </strong>
                </div>

                <div>
                  <span>Information type</span>
                  <strong>
                    Training record
                  </strong>
                </div>

                <div>
                  <span>Service journey</span>
                  <strong>
                    Youth Enterprise Support
                  </strong>
                </div>

                <div>
                  <span>Service link</span>
                  <strong>
                    {journeyConnectorMatches
                      ? 'Matched'
                      : 'Not matched'}
                  </strong>
                </div>
              </div>

              {connectorId && (
                <div className="setu-success-message">
                  Connector {connectorName || SKL_CONFIG.name}{' '}
                  already exists in this onboarding session.
                  Continue to the live source sample.
                </div>
              )}
            </>
          )}

          {currentStep === 1 && (
            <>
              <h3>Load source sample</h3>

              <p className="setu-form-help">
                MAHA SETU will read the real Skills &amp; Employment Registry
                source using the demo identity and show the returned record.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>Test identity · mobile</span>
                  <strong>
                    {DEMO_IDENTITY.mobile}
                  </strong>
                </div>

                <div>
                  <span>Test identity · date of birth</span>
                  <strong>
                    {DEMO_IDENTITY.dob}
                  </strong>
                </div>

                <div>
                  <span>Connected source</span>
                  <strong>
                    Skills &amp; Employment Registry
                  </strong>
                </div>
              </div>

              {sample?.raw && (
                <div className="setu-mapping-list">
                  {Object.entries(sample.raw).map(
                    ([key, value]) => (
                      <div key={key}>
                        <strong>{key}</strong>
                        <span>
                          {formatValue(value)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              {sample?.fields?.length > 0 && (
                <div className="setu-review-box">
                  <div>
                    <span>Detected fields</span>
                    <strong>
                      {sample.fields.length}
                    </strong>
                  </div>

                  <div>
                    <span>Sample duration</span>
                    <strong>
                      {formatValue(
                        sample.duration_ms,
                      )}
                      ms
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 2 && (
            <>
              <h3>Review data mapping</h3>

              <p className="setu-form-help">
                MAHA SETU generated this mapping from the live source
                structure. The mapping is saved before the connection
                can be tested.
              </p>

              {mapping ? (
                <>
                  <div className="setu-mapping-list">
                    {Object.entries(mapping).map(
                      ([target, specification]) => (
                        <div key={target}>
                          <strong>{target}</strong>

                          <span>
                            {mappingSource(
                              specification,
                            )}{' '}
                            ·{' '}
                            {mappingTransform(
                              specification,
                            )}
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="setu-review-box">
                    <div>
                      <span>MAHA SETU information fields</span>
                      <strong>
                        {Object.keys(mapping).length}
                      </strong>
                    </div>

                    <div>
                      <span>Persistence</span>
                      <strong>Saved to connector</strong>
                    </div>

                    <div>
                      <span>Mode</span>
                      <strong>Deterministic mapping</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="setu-review-box">
                  <div>
                    <span>Mapping status</span>
                    <strong>
                      Waiting for generation
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}

          {currentStep === 3 && (
            <>
              <h3>Test connection</h3>

              <p className="setu-form-help">
                The saved mapping is run against the same real source
                identity. MAHA SETU validates the resulting information
                before activation.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>Connector</span>
                  <strong>
                    Skills &amp; Employment Registry
                  </strong>
                </div>

                <div>
                  <span>Mapped information fields</span>
                  <strong>
                    {mapping
                      ? Object.keys(mapping).length
                      : 0}
                  </strong>
                </div>

                <div>
                  <span>Test identity</span>
                  <strong>
                    {DEMO_IDENTITY.mobile}
                  </strong>
                </div>
              </div>

              {testResult?.canonical && (
                <>
                  <div className="setu-mapping-list">
                    {Object.entries(
                      testResult.canonical,
                    ).map(([key, value]) => (
                      <div key={key}>
                        <strong>{key}</strong>
                        <span>
                          {formatValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="setu-review-box">
                    <div>
                      <span>Validation checks</span>
                      <strong>
                        {Array.isArray(
                          testResult.validation,
                        )
                          ? testResult.validation.length
                          : 0}
                      </strong>
                    </div>

                    <div>
                      <span>Test duration</span>
                      <strong>
                        {formatValue(
                          testResult.duration_ms,
                        )}
                        ms
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {currentStep === 4 && (
            <>
              <h3>Activate connection</h3>

              <p className="setu-form-help">
                Activate the validated source so the Youth Enterprise
                Support journey can use it during application processing.
              </p>

              <div className="setu-review-box">
                <div>
                  <span>Connector</span>
                  <strong>
                    {connectorName || SKL_CONFIG.name}
                  </strong>
                </div>

                <div>
                  <span>System</span>
                  <strong>
                    {SKL_CONFIG.system_code}
                  </strong>
                </div>

                <div>
                  <span>Journey</span>
                  <strong>{JOURNEY_ID}</strong>
                </div>

                <div>
                  <span>Step</span>
                  <strong>{STEP_ID}</strong>
                </div>

                <div>
                  <span>Requirement</span>
                  <strong>
                    TESTED → ACTIVE
                  </strong>
                </div>
              </div>

              {activationResult && (
                <>
                  <div className="setu-success-message">
                    Connector activated successfully. The live
                    journey step is now configured for execution.
                  </div>

                  <div className="setu-review-box">
                    <div>
                      <span>Connector status</span>
                      <strong>
                        {formatValue(
                          activationResult
                            ?.connector?.status,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Journey version</span>
                      <strong>
                        {formatValue(
                          activationResult.journey_version,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Onboarding time</span>
                      <strong>
                        {formatValue(
                          activationResult.onboarding_seconds,
                        )}
                        s
                      </strong>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="setu-studio-actions">
            <button
              className="setu-secondary-button"
              type="button"
              onClick={previousStep}
              disabled={
                currentStep === 0 ||
                loading
              }
            >
              Back
            </button>

            <button
              className="setu-primary-button"
              type="button"
              onClick={primaryAction}
              disabled={
                loading ||
                loadingContext ||
                (currentStep === 0 &&
                  (!selectedSystem ||
                    !supportedSystem ||
                    !journeyConnectorMatches)) ||
                (currentStep === 4 &&
                  Boolean(activationResult))
              }
            >
              {loading
                ? 'Working...'
                : primaryLabel}
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

export default AdminStudioPage
