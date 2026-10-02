import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { apiRequest } from '../api/client.js'
import {
  getAuthUser,
  setAuthSession,
} from '../auth/storage.js'
import heroImage from '../assets/mahasetu-login-hero.png'

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
    const username = registerForm.username.trim().toLowerCase()

    if (displayName.length < 2) {
      setRegisterError('Enter your full name.')
      return
    }

    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
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
          username,
          password: registerForm.password,
        }),
      })

      /*
       * Registration returns the same authenticated session shape
       * as login, so a real new citizen can continue immediately.
       */
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
      <header className="mahasetu-login-header">
        <div className="mahasetu-login-header-brand">
          <div
            className="mahasetu-login-ms-mark"
            aria-hidden="true"
          >
            MS
          </div>

          <div className="mahasetu-login-header-brand-copy">
            <strong>MAHA SETU</strong>
            <span>Unified Digital Services</span>
          </div>
        </div>

        <div className="mahasetu-login-header-title">
          <strong>
            MAHA<span>SETU</span>
          </strong>

          <span>
            Unified Platform for Government Services
          </span>
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
            Citizen access
            <small>Unified access</small>
          </span>
        </nav>
      </header>

      <section className="mahasetu-login-main">
        <section
          className="mahasetu-login-hero"
          id="services"
          aria-label="MAHA SETU services"
        >
          <img
            className="mahasetu-login-hero-image"
            src={heroImage}
            alt="MAHA SETU unified platform for government services in Maharashtra"
          />
        </section>

        <div
          className="mahasetu-login-hero-shade"
          aria-hidden="true"
        />

        <section
          className="mahasetu-login-card-wrap"
          id="login"
          aria-label="MAHA SETU sign in"
        >
          <div className="mahasetu-login-card">
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
              <span className="mahasetu-login-kicker">
                {mode.kicker}
              </span>

              <h1>{mode.title}</h1>

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

              <form
                onSubmit={handleSubmit}
                noValidate
              >
                <label className="mahasetu-login-field">
                  <span>{mode.label}</span>

                  <div className="mahasetu-login-input">
                    <span
                      className="mahasetu-login-field-icon"
                      aria-hidden="true"
                    >
                      ●
                    </span>

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
                    <span
                      className="mahasetu-login-field-icon"
                      aria-hidden="true"
                    >
                      ●
                    </span>

                    <input
                      required
                      type={
                        showPassword
                          ? 'text'
                          : 'password'
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
                      {showPassword
                        ? 'Hide'
                        : 'Show'}
                    </button>
                  </div>
                </label>

                <button
                  className="mahasetu-login-submit"
                  type="submit"
                >
                  Login
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
                    title: 'DigiLocker sign-in',
                    body:
                      'DigiLocker authentication is not connected to the prototype.',
                    note:
                      'Use the MAHA SETU username and password flow for this demonstration.',
                  })
                }
              >
                <span
                  className="mahasetu-login-digilocker-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="18"
                    height="18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect
                      x="3"
                      y="2.5"
                      width="14"
                      height="15"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M7 7h6M7 10h6M7 13h3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                Login with DigiLocker
              </button>

              <div className="mahasetu-login-account-row">
                <span>New User?</span>

                <button
                  type="button"
                  onClick={openRegister}
                >
                  Create an Account
                </button>
              </div>

              <div className="mahasetu-login-support">
                <strong>One secure entry point</strong>

                <span>
                  Your MAHA SETU account determines the
                  services and workspace available after
                  sign-in.
                </span>
              </div>
            </div>

            <div className="mahasetu-login-partners">
              <span>Digital India</span>
              <span>DigiLocker</span>
              <span>MAHA SETU Services</span>
            </div>

            <div className="mahasetu-login-card-footer">
              <span>Citizen</span>
              <span>Government Official</span>
              <span>Administrator</span>
            </div>
          </div>
        </section>
      </section>

      <footer className="mahasetu-login-footer">
        <div>
          <a href="#login">About MAHA SETU</a>
          <a href="#login">Terms of Use</a>
          <a href="#login">Privacy</a>
          <a href="#login">Help &amp; Support</a>
        </div>

        <span>
          Conceptual prototype · Synthetic data · Not affiliated
          with Government of Maharashtra
        </span>
      </footer>

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
            aria-labelledby="login-info-title"
          >
            <button
              className="mahasetu-login-modal-close"
              type="button"
              aria-label="Close information"
              onClick={() => setInfoDialog(null)}
            >
              ×
            </button>

            <span className="mahasetu-login-kicker">
              MAHA SETU ACCESS
            </span>

            <h2 id="login-info-title">
              {infoDialog.title}
            </h2>

            <p>{infoDialog.body}</p>

            <div className="mahasetu-login-modal-note">
              <strong>Prototype status</strong>
              <span>{infoDialog.note}</span>
            </div>

            <button
              className="mahasetu-login-modal-primary"
              type="button"
              onClick={() => setInfoDialog(null)}
            >
              Back to Login
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
            aria-labelledby="create-account-title"
          >
            <button
              className="mahasetu-login-modal-close"
              type="button"
              aria-label="Close registration"
              onClick={closeRegister}
            >
              ×
            </button>

            <span className="mahasetu-login-kicker">
              NEW CITIZEN ACCOUNT
            </span>

            <h2 id="create-account-title">
              Create an Account
            </h2>

            <p>
              Register once with MAHA SETU to access connected
              government services through a single account.
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
                <span>Username</span>
                <input
                  required
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      username: event.target.value,
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
                  placeholder="Create a password"
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
                  placeholder="Confirm your password"
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
                  Back to Login
                </button>

                <button
                  className="mahasetu-login-modal-primary"
                  type="submit"
                  disabled={registering}
                >
                  {registering
                    ? 'Creating Account…'
                    : 'Create Account'}
                </button>
              </div>
            </form>

            <p className="mahasetu-login-modal-footnote">
              New self-registered accounts receive the citizen role.
              Government staff accounts are provisioned separately.
            </p>
          </section>
        </div>
      )}

    </main>
  )
}
