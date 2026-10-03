import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import {
  getAuthUser,
  setAuthSession,
} from '../auth/storage.js'
import gatewayImage from '../assets/mahasetu-login-gateway.png'

const LOGIN_MODES = {
  citizen: {
    kicker: 'CITIZEN ACCESS',
    title: 'Welcome Back',
    subtitle: 'Login to access your government services.',
    label: 'Username',
    placeholder: 'Enter your username',
  },
  government: {
    kicker: 'GOVERNMENT OFFICIAL ACCESS',
    title: 'Official Sign In',
    subtitle: 'Use your official MAHA SETU account to continue.',
    label: 'Official Username',
    placeholder: 'Enter your official username',
  },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const existingUser = getAuthUser()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loginMode, setLoginMode] = useState('citizen')
  const [showRegister, setShowRegister] = useState(false)
  const [infoDialog, setInfoDialog] = useState(null)
  const [registering, setRegistering] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    dob: '',
    mobile: '',
    username: '',
    password: '',
    confirmPassword: '',
  })

  if (existingUser) {
    return <Navigate to={`/${existingUser.role}`} replace />
  }

  const mode = LOGIN_MODES[loginMode]

  function switchLoginMode(nextMode) {
    setLoginMode(nextMode)
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }

    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      setAuthSession(result.access_token, result.user)

      const role = result.user?.role

      if (role === 'admin') {
        navigate('/admin', { replace: true })
      } else if (role === 'officer') {
        navigate('/officer', { replace: true })
      } else {
        navigate('/citizen', { replace: true })
      }
    } catch (err) {
      setError(err.message || 'Unable to sign in.')
    }
  }

  function openRegister() {
    setError('')
    setRegisterError('')

    if (loginMode !== 'citizen') {
      setInfoDialog({
        title: 'Government account access',
        body:
          'Government Official accounts are provisioned for authorised staff and are not self-registered through this page.',
        note:
          'Use your provisioned officer or administrator account from the Government Official tab.',
      })
      return
    }

    setRegisterForm({
      displayName: '',
      dob: '',
      mobile: '',
      username: '',
      password: '',
      confirmPassword: '',
    })

    setShowRegister(true)
  }

  function closeRegister() {
    if (registering) {
      return
    }

    setShowRegister(false)
    setRegisterError('')
  }

  async function handleRegister(event) {
    event.preventDefault()
    setRegisterError('')

    const displayName = registerForm.displayName.trim()
    const dob = registerForm.dob
    const mobile = registerForm.mobile.trim()
    const newUsername = registerForm.username.trim().toLowerCase()

    if (displayName.length < 2) {
      setRegisterError('Enter your full name.')
      return
    }

    if (!dob) {
      setRegisterError('Enter your date of birth.')
      return
    }

    if (!/^\d{10}$/.test(mobile)) {
      setRegisterError('Enter a valid 10-digit mobile number.')
      return
    }

    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(newUsername)) {
      setRegisterError(
        'Username must be 3–64 characters using letters, numbers, dot, underscore or hyphen.',
      )
      return
    }

    if (registerForm.password.length < 8) {
      setRegisterError('Password must contain at least 8 characters.')
      return
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('Passwords do not match.')
      return
    }

    setRegistering(true)

    try {
      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          display_name: displayName,
          dob,
          mobile,
          username: newUsername,
          password: registerForm.password,
        }),
      })

      setAuthSession(result.access_token, result.user)
      navigate('/citizen', { replace: true })
    } catch (err) {
      setRegisterError(
        err.message || 'Unable to create your MAHA SETU account.',
      )
    } finally {
      setRegistering(false)
    }
  }

  return (
    <main className="mahasetu-login-page">
      <img
        className="mahasetu-login-background"
        src={gatewayImage}
        alt=""
        aria-hidden="true"
      />

      <div
        className="mahasetu-login-background-shade"
        aria-hidden="true"
      />

      <header className="mahasetu-login-header">
        <div className="mahasetu-login-header-title">
          <strong>
            MAHA<span>SETU</span>
          </strong>
          <span>Unified Platform for Government Services</span>
        </div>

        <nav
          className="mahasetu-login-header-actions"
          aria-label="Login navigation"
        >
          <a href="#login">One Login</a>
          <i aria-hidden="true" />
          <a href="#login">One Application</a>
          <i aria-hidden="true" />
          <a href="#services">Many Services</a>

          <span className="mahasetu-login-header-badge">
            Citizen First
            <small>Unified access</small>
          </span>
        </nav>
      </header>

      <section className="mahasetu-login-main">
        <section
          className="mahasetu-login-hero-copy"
          id="services"
          aria-label="About MAHA SETU"
        >
          <h1>
            Maha<span>Setu</span>
          </h1>

          <p className="mahasetu-login-slogan">
            सरल सेवा, <span>सुलभ शासन</span>
          </p>

          <div className="mahasetu-login-features">
            <div className="mahasetu-login-feature">
              <span className="mahasetu-login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                  <circle cx="12" cy="15" r="1.2" />
                </svg>
              </span>
              <span>
                <strong>One login</strong>
                <small>Access multiple services through one account</small>
              </span>
            </div>

            <div className="mahasetu-login-feature">
              <span className="mahasetu-login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 3.5h9l4 4V20.5H6z" />
                  <path d="M15 3.5v4h4M9 12h6M9 16h6" />
                </svg>
              </span>
              <span>
                <strong>Track your applications</strong>
                <small>Follow progress from submission to decision</small>
              </span>
            </div>

            <div className="mahasetu-login-feature">
              <span className="mahasetu-login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 20h16M6 20V9h12v11M8 9V6h8v3M10 6V4h4v2" />
                  <path d="M9 13h1M14 13h1M9 16h1M14 16h1" />
                </svg>
              </span>
              <span>
                <strong>Multiple departments</strong>
                <small>Connected services without fragmented journeys</small>
              </span>
            </div>

            <div className="mahasetu-login-feature">
              <span className="mahasetu-login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m12 3 7 3v5c0 4.3-2.7 7.7-7 10-4.3-2.3-7-5.7-7-10V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>
                <strong>Secure and hassle-free</strong>
                <small>Role-aware access with a clear service journey</small>
              </span>
            </div>

            <div className="mahasetu-login-feature">
              <span className="mahasetu-login-feature-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="17" cy="9" r="2.5" />
                  <path d="M3.5 19c.7-3.2 2.7-5 5.5-5s4.8 1.8 5.5 5" />
                  <path d="M14 16c2.2-.2 4 .9 4.9 3" />
                </svg>
              </span>
              <span>
                <strong>Citizen First, Always</strong>
                <small>One place to access connected government services</small>
              </span>
            </div>
          </div>

        </section>

        <section
          className="mahasetu-login-card-wrap"
          id="login"
          aria-label="MAHA SETU sign in"
        >
          <article className="mahasetu-login-card">
            <div
              className="mahasetu-login-tabs"
              role="tablist"
              aria-label="Login type"
            >
              <button
                className={
                  loginMode === 'citizen' ? 'active' : ''
                }
                type="button"
                role="tab"
                aria-selected={loginMode === 'citizen'}
                onClick={() => switchLoginMode('citizen')}
              >
                Citizen / Applicant
              </button>

              <button
                className={
                  loginMode === 'government' ? 'active' : ''
                }
                type="button"
                role="tab"
                aria-selected={loginMode === 'government'}
                onClick={() => switchLoginMode('government')}
              >
                Government Official
              </button>
            </div>

            <div className="mahasetu-login-form-content">
              <div className="mahasetu-login-card-kicker">
                <span>{mode.kicker}</span>
                <i aria-hidden="true" />
                <small>Secure access</small>
              </div>

              <h2>{mode.title}</h2>

              <p className="mahasetu-login-subtitle">
                {mode.subtitle}
              </p>

              {error && (
                <p
                  className="mahasetu-login-error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <label className="mahasetu-login-field">
                  <span>{mode.label}</span>

                  <div className="mahasetu-login-input">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20c.8-3.2 3.1-5 7-5s6.2 1.8 7 5" />
                    </svg>

                    <input
                      required
                      value={username}
                      onChange={(event) =>
                        setUsername(event.target.value)
                      }
                      autoComplete="username"
                      placeholder={mode.placeholder}
                    />
                  </div>
                </label>

                <label className="mahasetu-login-field">
                  <span>Password</span>

                  <div className="mahasetu-login-input">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>

                    <input
                      required
                      type={
                        showPassword ? 'text' : 'password'
                      }
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      autoComplete="current-password"
                      placeholder="Enter your password"
                    />

                    <button
                      className="mahasetu-login-password-toggle"
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (value) => !value,
                        )
                      }
                      aria-label={
                        showPassword
                          ? 'Hide password'
                          : 'Show password'
                      }
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>

                <button
                  className="mahasetu-login-submit"
                  type="submit"
                >
                  <span>Login securely</span>
                  <span aria-hidden="true">→</span>
                </button>
              </form>

              <button
                className="mahasetu-login-forgot"
                type="button"
                onClick={() =>
                  setInfoDialog({
                    title: 'Password help',
                    body:
                      'Password recovery is not connected to the prototype authentication service.',
                    note:
                      'For this demonstration, use a provisioned MAHA SETU account.',
                  })
                }
              >
                Forgot Password?
              </button>

              <div className="mahasetu-login-divider">
                <span />
                <strong>OR</strong>
                <span />
              </div>

              <button
                className="mahasetu-login-digilocker"
                type="button"
                onClick={() =>
                  setInfoDialog({
                    title: 'DigiLocker access',
                    body:
                      'DigiLocker integration is represented as a prototype entry point in this demonstration.',
                    note:
                      'Use the MAHA SETU username and password flow for this demonstration.',
                  })
                }
              >
                <span className="mahasetu-login-digilocker-icon">
                  D
                </span>
                <span>
                  <strong>Continue with DigiLocker</strong>
                  <small>Prototype integration entry point</small>
                </span>
              </button>

              <div className="mahasetu-login-account-row">
                <span>New to MAHA SETU?</span>
                <button
                  type="button"
                  onClick={openRegister}
                >
                  Create an account
                </button>
              </div>

              <div className="mahasetu-login-card-note">
                <span className="mahasetu-login-card-note-icon">
                  ✓
                </span>
                <span>
                  <strong>Prototype service access</strong>
                  <small>
                    Synthetic data and demonstration accounts are used.
                  </small>
                </span>
              </div>
            </div>
          </article>
        </section>
      </section>

      {infoDialog && (
        <div
          className="mahasetu-login-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setInfoDialog(null)
            }
          }}
        >
          <section
            className="mahasetu-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mahasetu-info-title"
          >
            <button
              className="mahasetu-login-modal-close"
              type="button"
              onClick={() => setInfoDialog(null)}
              aria-label="Close dialog"
            >
              ×
            </button>

            <span className="mahasetu-login-kicker">
              MAHA SETU ACCESS
            </span>

            <h2 id="mahasetu-info-title">
              {infoDialog.title}
            </h2>

            <p>{infoDialog.body}</p>

            <div className="mahasetu-login-modal-note">
              <strong>Note</strong>
              <span>{infoDialog.note}</span>
            </div>

            <button
              className="mahasetu-login-modal-primary"
              type="button"
              onClick={() => setInfoDialog(null)}
            >
              Continue
            </button>
          </section>
        </div>
      )}

      {showRegister && (
        <div
          className="mahasetu-login-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRegister()
            }
          }}
        >
          <section
            className="mahasetu-login-modal mahasetu-registration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mahasetu-register-title"
          >
            <button
              className="mahasetu-login-modal-close"
              type="button"
              onClick={closeRegister}
              disabled={registering}
              aria-label="Close registration"
            >
              ×
            </button>

            <span className="mahasetu-login-kicker">
              CITIZEN ACCOUNT
            </span>

            <h2 id="mahasetu-register-title">
              Create your MAHA SETU account
            </h2>

            <p className="mahasetu-login-modal-copy">
              Register once with MAHA SETU to access connected
              government services through one identity.
            </p>

            {registerError && (
              <p
                className="mahasetu-login-error"
                role="alert"
              >
                {registerError}
              </p>
            )}

            <form
              className="mahasetu-registration-form"
              onSubmit={handleRegister}
              noValidate
            >
              <label className="mahasetu-registration-field">
                <span>Full name</span>
                <input
                  required
                  type="text"
                  value={registerForm.displayName}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  autoComplete="name"
                  placeholder="Enter your full name"
                  disabled={registering}
                />
              </label>

              <label className="mahasetu-registration-field">
                <span>Date of birth</span>
                <input
                  required
                  type="date"
                  value={registerForm.dob}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      dob: event.target.value,
                    }))
                  }
                  disabled={registering}
                />
              </label>

              <label className="mahasetu-registration-field">
                <span>Mobile number</span>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={registerForm.mobile}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      mobile: event.target.value.replace(
                        /\D/g,
                        '',
                      ),
                    }))
                  }
                  autoComplete="tel"
                  placeholder="10-digit mobile number"
                  disabled={registering}
                />
              </label>

              <label className="mahasetu-registration-field">
                <span>Username</span>
                <input
                  required
                  type="text"
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      username: event.target.value.toLowerCase(),
                    }))
                  }
                  autoComplete="username"
                  placeholder="Choose a username"
                  disabled={registering}
                />
              </label>

              <label className="mahasetu-registration-field">
                <span>Password</span>
                <input
                  required
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  disabled={registering}
                />
              </label>

              <label className="mahasetu-registration-field">
                <span>Confirm password</span>
                <input
                  required
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  disabled={registering}
                />
              </label>

              <div className="mahasetu-registration-actions">
                <button
                  className="mahasetu-registration-secondary"
                  type="button"
                  onClick={closeRegister}
                  disabled={registering}
                >
                  Cancel
                </button>

                <button
                  className="mahasetu-login-modal-primary"
                  type="submit"
                  disabled={registering}
                >
                  {registering
                    ? 'Creating account…'
                    : 'Create account'}
                </button>
              </div>
            </form>

            <p className="mahasetu-login-modal-footnote">
              Registration creates a citizen account and starts an
              authenticated MAHA SETU session.
            </p>
          </section>
        </div>
      )}
    </main>
  )
}
