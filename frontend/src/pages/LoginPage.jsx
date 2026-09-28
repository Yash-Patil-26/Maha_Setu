import { useState } from 'react'
import { apiRequest } from '../api/client.js'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAuthUser, setAuthSession } from '../auth/storage.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const existingUser = getAuthUser()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (existingUser) {
    return <Navigate to={`/${existingUser.role}`} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password) {
      setError('Enter a valid username and password.')
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

  return (
    <main className="mahasetu-login-page">
      <header className="mahasetu-header">
        <div className="mahasetu-government">
          <div className="mahasetu-government-mark" aria-hidden="true">
            MS
          </div>
          <div>
            <strong>MahaSetu</strong>
            <span>Unified Digital Services</span>
          </div>
        </div>

        <div className="mahasetu-header-brand">
          <strong>
            Maha<span>Setu</span>
          </strong>
          <span>Unified Platform for Government Services</span>
        </div>

        <nav className="mahasetu-header-nav" aria-label="Main navigation">
          <a href="#login">One Login</a>
          <a href="#application">One Application</a>
          <a href="#services">Many Services</a>
          <button type="button">Citizen First<br />Digital Maharashtra</button>
        </nav>
      </header>

      <section className="mahasetu-login-content">
        <section className="mahasetu-hero">
          <img
            src="/images/mahasetu-hero.png"
            alt="MahaSetu services and Gateway of India"
          />
        </section>

        <section className="mahasetu-login-panel" id="login">
          <div className="mahasetu-login-box">
            <div className="mahasetu-login-tabs">
              <button className="active" type="button">
                Citizen / Business
              </button>
              <button type="button">
                Government Official
              </button>
            </div>

            <div className="mahasetu-form-content">
              <h1>Welcome Back</h1>
              <p className="login-subtitle">
                Login to access your government services.
              </p>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <label>
                  Mobile Number / Email / Username
                  <div className="login-input">
                    <span className="field-icon user-icon" aria-hidden="true" />
                    <input
                      required
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      placeholder="Enter your username"
                    />
                  </div>
                </label>

                <label>
                  Password
                  <div className="login-input">
                    <span className="field-icon lock-icon" aria-hidden="true" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                    />
                    <button
                      className="password-toggle"
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="eye-icon" aria-hidden="true" />
                    </button>
                  </div>
                </label>

                <button className="mahasetu-login-button" type="submit">
                  Login
                </button>
              </form>

              <button className="forgot-password" type="button">
                Forgot Password?
              </button>

              <div className="login-divider">
                <span>OR</span>
              </div>

              <button className="digilocker-button" type="button">
                <span className="digilocker-icon" aria-hidden="true" />
                Login with DigiLocker
              </button>

              <p className="create-account">
                New User? <button type="button">Create an Account</button>
              </p>
            </div>

            <div className="login-partners">
              <span>
                <i className="partner-icon india-icon" aria-hidden="true" />
                Digital India
              </span>

              <span>
                <i className="partner-icon digi-icon" aria-hidden="true" />
                DigiLocker
              </span>
            </div>
          </div>
        </section>
      </section>

      <footer className="mahasetu-footer">
        <div>
          <a href="#about">About MahaSetu</a>
          <a href="#terms">Terms of Use</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#support">Help &amp; Support</a>
        </div>

        <span className="prototype-disclosure">
          Conceptual prototype — not affiliated with Government of Maharashtra.
        </span>
      </footer>
    </main>
  )
}
